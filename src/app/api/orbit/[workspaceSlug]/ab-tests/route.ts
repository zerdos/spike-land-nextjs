/**
 * A/B Testing API
 *
 * Manages social post A/B tests with variant creation and performance tracking.
 * Resolves #840
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { AbTestStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string }>;
}

// Validation schemas
const createAbTestSchema = z.object({
  name: z.string().min(1).max(200),
  originalPostId: z.string().cuid(),
  significanceLevel: z.number().min(0.8).max(0.99).default(0.95),
  variants: z
    .array(
      z.object({
        content: z.string().min(1),
        variationType: z.enum(["headline", "cta", "emoji", "hashtags", "tone"]),
      })
    )
    .min(2)
    .max(5),
});

/**
 * GET /api/orbit/[workspaceSlug]/ab-tests
 * List all A/B tests for workspace
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace and verify membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: { id: true },
    })
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found" },
      { status: 404 }
    );
  }

  // Query parameters
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") as AbTestStatus | null;

  // Fetch tests
  const { data: tests, error: testsError } = await tryCatch(
    prisma.socialPostAbTest.findMany({
      where: {
        workspaceId: workspace.id,
        ...(status && { status }),
      },
      include: {
        variants: true,
        originalPost: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  if (testsError) {
    return NextResponse.json(
      { error: "Failed to fetch A/B tests" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tests });
}

/**
 * POST /api/orbit/[workspaceSlug]/ab-tests
 * Create new A/B test
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate body
  const body = await request.json();
  const validated = createAbTestSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 }
    );
  }

  const { name, originalPostId, significanceLevel, variants } = validated.data;

  try {
    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: {
        id: true,
        maxAbTests: true,
        subscriptionTier: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check permission
    await requireWorkspacePermission(session, workspace.id, "content:create");

    // Check subscription limits
    const activeTestsCount = await prisma.socialPostAbTest.count({
      where: {
        workspaceId: workspace.id,
        status: { in: ["DRAFT", "RUNNING"] },
      },
    });

    if (activeTestsCount >= workspace.maxAbTests) {
      return NextResponse.json(
        {
          error: `Maximum active A/B tests reached (${workspace.maxAbTests}). Upgrade to ${workspace.subscriptionTier === "FREE" ? "PRO" : "ENTERPRISE"} for more.`,
        },
        { status: 403 }
      );
    }

    // Verify original post exists and belongs to workspace (via createdBy user)
    const originalPost = await prisma.socialPost.findFirst({
      where: {
        id: originalPostId,
        createdBy: {
          id: session.user.id,
        },
      },
    });

    if (!originalPost) {
      return NextResponse.json(
        { error: "Original post not found or not accessible" },
        { status: 404 }
      );
    }

    // Create A/B test with variants
    const abTest = await prisma.socialPostAbTest.create({
      data: {
        name,
        workspaceId: workspace.id,
        originalPostId,
        significanceLevel,
        status: "DRAFT",
        variants: {
          create: variants.map((v) => ({
            content: v.content,
            variationType: v.variationType,
          })),
        },
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(abTest, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create A/B test:", error);

    let status = 500;
    let message = "Failed to create A/B test";

    if (error instanceof Error) {
      const errWithStatus = error as Error & {
        status?: number;
        statusCode?: number;
      };
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
      }
      if (error.message) {
        message = error.message;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
