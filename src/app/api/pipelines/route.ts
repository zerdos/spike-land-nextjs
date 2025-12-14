import { auth } from "@/auth";
import { SYSTEM_DEFAULT_PIPELINE } from "@/lib/ai/pipeline-types";
import prisma from "@/lib/prisma";
import { EnhancementTier, PipelineVisibility } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * GET /api/pipelines
 * List pipelines accessible to the current user:
 * - User's own pipelines
 * - Public pipelines from other users
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pipelines = await prisma.enhancementPipeline.findMany({
      where: {
        OR: [
          { userId: session.user.id }, // User's own pipelines
          { visibility: PipelineVisibility.PUBLIC }, // Public pipelines
          { userId: null }, // System defaults
        ],
      },
      orderBy: [
        { userId: "asc" }, // System defaults first (null)
        { usageCount: "desc" }, // Then by popularity
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        visibility: true,
        tier: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
        analysisConfig: true,
        autoCropConfig: true,
        promptConfig: true,
        generationConfig: true,
      },
    });

    // Add isOwner and isSystemDefault flags
    const pipelinesWithFlags = pipelines.map((p) => ({
      ...p,
      isOwner: p.userId === session.user.id,
      isSystemDefault: p.userId === null,
    }));

    return NextResponse.json({ pipelines: pipelinesWithFlags });
  } catch (error) {
    console.error("Error listing pipelines:", error);
    return NextResponse.json(
      { error: "Failed to list pipelines" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pipelines
 * Create a new pipeline
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      tier = "TIER_1K",
      visibility = "PRIVATE",
      analysisConfig,
      autoCropConfig,
      promptConfig,
      generationConfig,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Pipeline name must be 100 characters or less" },
        { status: 400 },
      );
    }

    // Validate tier
    const validTiers: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate visibility
    const validVisibilities: PipelineVisibility[] = ["PRIVATE", "PUBLIC", "LINK"];
    if (!validVisibilities.includes(visibility)) {
      return NextResponse.json(
        { error: `Invalid visibility. Must be one of: ${validVisibilities.join(", ")}` },
        { status: 400 },
      );
    }

    // Create pipeline with defaults merged
    const pipeline = await prisma.enhancementPipeline.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: session.user.id,
        tier,
        visibility,
        analysisConfig: analysisConfig ?? SYSTEM_DEFAULT_PIPELINE.analysis,
        autoCropConfig: autoCropConfig ?? SYSTEM_DEFAULT_PIPELINE.autoCrop,
        promptConfig: promptConfig ?? SYSTEM_DEFAULT_PIPELINE.prompt,
        generationConfig: generationConfig ?? SYSTEM_DEFAULT_PIPELINE.generation,
        // Generate share token for LINK visibility
        shareToken: visibility === "LINK" ? crypto.randomUUID() : null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        visibility: true,
        shareToken: true,
        tier: true,
        analysisConfig: true,
        autoCropConfig: true,
        promptConfig: true,
        generationConfig: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 },
    );
  }
}
