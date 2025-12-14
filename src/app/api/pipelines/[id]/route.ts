import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { EnhancementTier, PipelineVisibility } from "@prisma/client";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; }>;
}

/**
 * GET /api/pipelines/[id]
 * Get a specific pipeline
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pipeline = await prisma.enhancementPipeline.findUnique({
      where: { id },
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
        _count: {
          select: {
            albums: true,
            jobs: true,
          },
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Check access
    const isOwner = pipeline.userId === session.user.id;
    const isSystemDefault = pipeline.userId === null;
    const isPublic = pipeline.visibility === PipelineVisibility.PUBLIC;

    if (!isOwner && !isSystemDefault && !isPublic) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      pipeline: {
        ...pipeline,
        isOwner,
        isSystemDefault,
        albumCount: pipeline._count.albums,
        jobCount: pipeline._count.jobs,
      },
    });
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pipelines/[id]
 * Update a pipeline
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check ownership
    const existing = await prisma.enhancementPipeline.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can update this pipeline" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      tier,
      visibility,
      analysisConfig,
      autoCropConfig,
      promptConfig,
      generationConfig,
    } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Pipeline name cannot be empty" },
          { status: 400 },
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "Pipeline name must be 100 characters or less" },
          { status: 400 },
        );
      }
    }

    // Validate tier if provided
    if (tier !== undefined) {
      const validTiers: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];
      if (!validTiers.includes(tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` },
          { status: 400 },
        );
      }
    }

    // Validate visibility if provided
    if (visibility !== undefined) {
      const validVisibilities: PipelineVisibility[] = ["PRIVATE", "PUBLIC", "LINK"];
      if (!validVisibilities.includes(visibility)) {
        return NextResponse.json(
          { error: `Invalid visibility. Must be one of: ${validVisibilities.join(", ")}` },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (tier !== undefined) updateData.tier = tier;
    if (visibility !== undefined) {
      updateData.visibility = visibility;
      // Generate share token when switching to LINK visibility
      if (visibility === "LINK") {
        const current = await prisma.enhancementPipeline.findUnique({
          where: { id },
          select: { shareToken: true },
        });
        if (!current?.shareToken) {
          updateData.shareToken = crypto.randomUUID();
        }
      }
    }
    if (analysisConfig !== undefined) updateData.analysisConfig = analysisConfig;
    if (autoCropConfig !== undefined) updateData.autoCropConfig = autoCropConfig;
    if (promptConfig !== undefined) updateData.promptConfig = promptConfig;
    if (generationConfig !== undefined) updateData.generationConfig = generationConfig;

    const pipeline = await prisma.enhancementPipeline.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error("Error updating pipeline:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pipelines/[id]
 * Delete a pipeline
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check ownership and usage
    const existing = await prisma.enhancementPipeline.findUnique({
      where: { id },
      select: {
        userId: true,
        _count: {
          select: {
            albums: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete this pipeline" },
        { status: 403 },
      );
    }

    // Check if pipeline is in use by albums
    if (existing._count.albums > 0) {
      return NextResponse.json(
        {
          error:
            `Cannot delete pipeline: it is being used by ${existing._count.albums} album(s). Remove pipeline from albums first.`,
        },
        { status: 400 },
      );
    }

    await prisma.enhancementPipeline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pipeline:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 },
    );
  }
}
