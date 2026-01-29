import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { enqueueMessage } from "@/lib/upstash";
import { appCreationSchema, appPromptCreationSchema } from "@/lib/validations/app";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Ensures the user exists in the database.
 * This is a defensive check for cases where the auth sign-in callback
 * failed to create the user but still allowed authentication to proceed.
 */
async function ensureUserExists(session: {
  user: { id: string; email?: string | null; name?: string | null; image?: string | null; };
}): Promise<{ success: boolean; userId: string; }> {
  const { user } = session;

  // First, check if user exists
  const { data: existingUser, error: findError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    }),
  );

  if (findError) {
    console.error("Error checking user existence:", findError);
    return { success: false, userId: user.id };
  }

  if (existingUser) {
    return { success: true, userId: existingUser.id };
  }

  // User doesn't exist, create them
  // This handles the edge case where auth sign-in failed to create the user
  console.warn(`User ${user.id} authenticated but not in database, creating now`);

  const { data: newUser, error: createError } = await tryCatch(
    prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      select: { id: true },
    }),
  );

  if (createError) {
    // If creation fails due to unique constraint (email), try to find by email
    // Prisma uses code P2002 for unique constraint violations
    const isUniqueViolation = (createError as { code?: string; }).code === "P2002" ||
      String(createError.message || "").includes("Unique constraint");
    if (user.email && isUniqueViolation) {
      const { data: userByEmail } = await tryCatch(
        prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        }),
      );
      if (userByEmail) {
        // User exists with different ID (shouldn't happen, but handle it)
        console.warn(`User found by email with different ID: ${userByEmail.id} vs ${user.id}`);
        return { success: true, userId: userByEmail.id };
      }
    }
    console.error("Error creating user:", createError);
    return { success: false, userId: user.id };
  }

  return { success: true, userId: newUser.id };
}

// Word lists for generating descriptive app names
const ADJECTIVES = [
  "swift",
  "bright",
  "cosmic",
  "digital",
  "clever",
  "stellar",
  "nimble",
  "sleek",
  "vibrant",
  "dynamic",
  "agile",
  "bold",
  "smart",
  "rapid",
  "fresh",
];
const NOUNS = [
  "forge",
  "spark",
  "wave",
  "pulse",
  "flow",
  "nexus",
  "orbit",
  "prism",
  "grid",
  "core",
  "hub",
  "vault",
  "bridge",
  "beacon",
  "studio",
];
const VERBS = [
  "launch",
  "build",
  "craft",
  "sync",
  "boost",
  "stream",
  "dash",
  "snap",
  "blend",
  "shift",
  "link",
  "push",
  "rise",
  "glow",
  "zoom",
];

function generateAppName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  return `${adj}-${noun}-${verb}`;
}

function generateSlug(): string {
  const name = generateAppName();
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${name}-${suffix}`;
}

/**
 * POST /api/apps
 * Create a new app - supports both legacy and prompt-based flow
 */
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user exists in database (defensive check for auth edge cases)
  const { success: userExists, userId } = await ensureUserExists(session);
  if (!userExists) {
    console.error("Failed to ensure user exists for app creation");
    return NextResponse.json(
      { error: "User account not properly initialized. Please sign out and sign in again." },
      { status: 500 },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Try prompt-based creation first (new flow)
  const promptResult = appPromptCreationSchema.safeParse(body);
  if (promptResult.success) {
    return createAppFromPrompt(userId, promptResult.data);
  }

  // Fall back to legacy creation flow
  const parseResult = appCreationSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const validatedData = parseResult.data;

  // Build codespace URL if codespaceId is provided
  const codespaceUrl = validatedData.codespaceId
    ? `https://testing.spike.land/live/${validatedData.codespaceId}`
    : undefined;

  const { data: app, error: createError } = await tryCatch(
    prisma.app.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        userId,
        status: "PROMPTING",
        ...(validatedData.codespaceId && {
          codespaceId: validatedData.codespaceId,
        }),
        codespaceUrl,
        requirements: {
          create: {
            description: validatedData.requirements,
            priority: "MEDIUM",
            status: "PENDING",
          },
        },
        monetizationModels: {
          create: {
            type: mapMonetizationModelToEnum(validatedData.monetizationModel),
            features: [],
          },
        },
      },
      include: {
        requirements: true,
        monetizationModels: true,
        messages: true,
        statusHistory: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating app:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(app, { status: 201 });
}

/**
 * Create an app from a simple prompt (new simplified flow)
 */
async function createAppFromPrompt(
  userId: string,
  data: {
    prompt: string;
    imageIds?: string[];
    codespaceId?: string;
    templateId?: string;
    workspaceId?: string;
    linkedCampaign?: string;
  },
) {
  // If codespaceId is provided, use it. Otherwise generate a new slug.
  const slug = data.codespaceId ? data.codespaceId : generateSlug();

  // Check if codespaceId/slug already exists globally (unique constraint)
  // This includes soft-deleted apps to prevent name conflicts during 30-day retention
  const { data: existingApp } = await tryCatch(
    prisma.app.findFirst({
      where: {
        OR: [
          { codespaceId: slug },
          { slug: slug },
        ],
      },
      select: { id: true, userId: true, deletedAt: true },
    }),
  );

  if (existingApp) {
    // Different error messages based on context
    if (existingApp.userId === userId) {
      if (existingApp.deletedAt) {
        return NextResponse.json(
          {
            error:
              "An app with this name exists in your bin. Please restore or permanently delete it first.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "You already have an app with this name. Please use a different name." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "This codespace name is already taken. Please choose a different name." },
      { status: 409 },
    );
  }

  // Create a name from the slug (stripping potential random suffix if it's long enough)
  const name = slug
    .split("-")
    // Simple heuristic: if it looks like our generated id (adj-noun-verb-suffix), try to keep just the words
    // But since the user sees the slug, using it as the name initially is fine
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const { data: result, error: createError } = await tryCatch(
    prisma.$transaction(async (tx) => {
      // Create the app
      const app = await tx.app.create({
        data: {
          name,
          slug,
          userId,
          status: "WAITING", // Skip PROMPTING since we have the prompt
          codespaceId: slug, // Use slug as codespaceId (since we set slug = codespaceId if provided)
          codespaceUrl: `https://testing.spike.land/live/${slug}/`,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          codespaceId: true,
          codespaceUrl: true,
          createdAt: true,
        },
      });

      // Create initial status history
      await tx.appStatusHistory.create({
        data: {
          appId: app.id,
          status: "WAITING",
          message: "App created with initial prompt",
        },
      });

      // Create the first message with the prompt (or template code if provided)
      let messageContent = data.prompt;

      // If a template is specified, prepend template code to the prompt
      if (data.templateId) {
        // Import template dynamically at runtime
        const { getTemplateById } = await import("@/app/my-apps/templates");
        const template = getTemplateById(data.templateId);

        if (template) {
          // Send template code as initial content
          messageContent = `I'd like to start with this template code:\n\n\`\`\`tsx\n${template.code}\n\`\`\`\n\n${data.prompt}`;
        }
      }

      const message = await tx.appMessage.create({
        data: {
          appId: app.id,
          role: "USER",
          content: messageContent,
        },
      });

      // Attach images if provided
      if (data.imageIds && data.imageIds.length > 0) {
        // First, associate images with this app (if they were uploaded before app creation)
        await tx.appImage.updateMany({
          where: { id: { in: data.imageIds } },
          data: { appId: app.id },
        });

        // Create attachments linking images to the message
        const validImages = await tx.appImage.findMany({
          where: {
            id: { in: data.imageIds },
            appId: app.id,
          },
          select: { id: true },
        });

        if (validImages.length > 0) {
          await tx.appAttachment.createMany({
            data: validImages.map((img) => ({
              messageId: message.id,
              imageId: img.id,
            })),
          });
        }
      }

      // Link to workspace if provided
      if (data.workspaceId) {
        // Verify workspace exists and user has access
        const workspace = await tx.workspace.findFirst({
          where: {
            id: data.workspaceId,
            members: {
              some: {
                userId,
              },
            },
          },
          select: { id: true },
        });

        if (workspace) {
          // Determine purpose from templateId if available
          let purpose: string | null = null;
          if (data.templateId) {
            const { getTemplateById } = await import("@/app/my-apps/templates");
            const template = getTemplateById(data.templateId);
            if (template) {
              purpose = template.purpose;
            }
          }

          await tx.workspaceApp.create({
            data: {
              workspaceId: data.workspaceId,
              appId: app.id,
              purpose,
              linkedCampaign: data.linkedCampaign || null,
            },
          });
        }
      }

      return { app, messageId: message.id };
    }),
  );

  if (createError || !result) {
    console.error("Error creating app from prompt:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Enqueue message for agent processing
  const { error: enqueueError } = await tryCatch(
    enqueueMessage(result.app.id, result.messageId),
  );

  if (enqueueError) {
    console.error(
      `[App Creation] Failed to enqueue message for app ${result.app.id}:`,
      enqueueError,
    );
    // Don't fail the request - the app was created successfully.
    // The user can still manually trigger the agent later.
  }

  return NextResponse.json(result.app, { status: 201 });
}

/**
 * GET /api/apps
 * Get all apps for the current user
 */
export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for curated/public apps query (for anonymous or gallery view)
  const { searchParams } = new URL(request.url);
  const showCurated = searchParams.get("curated") === "true";

  if (showCurated) {
    // Return public curated apps (no auth required for viewing)
    const { data: curatedApps, error: curatedError } = await tryCatch(
      prisma.app.findMany({
        where: {
          isCurated: true,
          isPublic: true,
          status: "LIVE",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          codespaceUrl: true,
          status: true,
          createdAt: true,
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    );

    if (curatedError) {
      console.error("Error fetching curated apps:", curatedError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json(curatedApps);
  }

  // Return user's own apps
  const { data: apps, error: fetchError } = await tryCatch(
    prisma.app.findMany({
      where: {
        userId: session.user.id,
        status: { notIn: ["ARCHIVED"] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        codespaceId: true,
        codespaceUrl: true,
        isCurated: true,
        isPublic: true,
        lastAgentActivity: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
            images: true,
          },
        },
        messages: {
          where: { isRead: false, role: "AGENT" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );

  if (fetchError) {
    console.error("Error fetching apps:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Transform to include unread count
  const appsWithUnread = apps.map((app) => ({
    ...app,
    unreadCount: app.messages.length,
    messages: undefined, // Remove messages array
  }));

  return NextResponse.json(appsWithUnread);
}

function mapMonetizationModelToEnum(model: string) {
  const mapping: Record<
    string,
    "FREE" | "FREEMIUM" | "SUBSCRIPTION" | "ONE_TIME" | "USAGE_BASED"
  > = {
    "free": "FREE",
    "freemium": "FREEMIUM",
    "subscription": "SUBSCRIPTION",
    "one-time": "ONE_TIME",
    "usage-based": "USAGE_BASED",
  };
  return mapping[model] || "FREE";
}
