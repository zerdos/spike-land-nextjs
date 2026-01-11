import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { enqueueMessage } from "@/lib/upstash";
import { appCreationSchema, appPromptCreationSchema } from "@/lib/validations/app";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Try prompt-based creation first (new flow)
  const promptResult = appPromptCreationSchema.safeParse(body);
  if (promptResult.success) {
    return createAppFromPrompt(session.user.id, promptResult.data);
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
        userId: session.user.id,
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
  data: { prompt: string; imageIds?: string[]; codespaceId?: string; },
) {
  // If codespaceId is provided, use it. Otherwise generate a new slug.
  const slug = data.codespaceId ? data.codespaceId : generateSlug();

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

      // Create the first message with the prompt
      const message = await tx.appMessage.create({
        data: {
          appId: app.id,
          role: "USER",
          content: data.prompt,
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
  await tryCatch(enqueueMessage(result.app.id, result.messageId));

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
