import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { ENHANCEMENT_COSTS } from "@/lib/tokens/costs";
import { batchEnhanceImagesDirect, type BatchEnhanceInput } from "@/workflows/batch-enhance.direct";
import { batchEnhanceImages } from "@/workflows/batch-enhance.workflow";
import { EnhancementTier } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

const MAX_BATCH_SIZE = 20;

// Check if we're running in Vercel environment
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1";
}

type RouteParams = { params: Promise<{ id: string; }>; };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: albumId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tier, skipAlreadyEnhanced = true } = body as {
      tier: EnhancementTier;
      skipAlreadyEnhanced?: boolean;
    };

    // Validate tier
    if (!tier || !Object.keys(ENHANCEMENT_COSTS).includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Verify album exists and belongs to user
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { userId: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all images in album with their enhancement jobs
    const albumImages = await prisma.albumImage.findMany({
      where: { albumId },
      include: {
        image: {
          include: {
            enhancementJobs: {
              where: {
                status: "COMPLETED",
                tier,
              },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (albumImages.length === 0) {
      return NextResponse.json(
        { error: "No images found in album" },
        { status: 404 },
      );
    }

    // Filter out already enhanced images if requested
    const imagesToEnhance = skipAlreadyEnhanced
      ? albumImages.filter((ai) => ai.image.enhancementJobs.length === 0)
      : albumImages;

    const skippedCount = albumImages.length - imagesToEnhance.length;

    if (imagesToEnhance.length === 0) {
      return NextResponse.json({
        success: true,
        totalImages: albumImages.length,
        skipped: skippedCount,
        queued: 0,
        totalCost: 0,
        newBalance: (await TokenBalanceManager.getBalance(session.user.id)).balance,
        jobs: [],
      });
    }

    // Check batch size limit
    if (imagesToEnhance.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error:
            `Maximum ${MAX_BATCH_SIZE} images allowed per batch enhancement. This album has ${imagesToEnhance.length} images to enhance.`,
        },
        { status: 400 },
      );
    }

    // Calculate total cost
    const tokenCost = ENHANCEMENT_COSTS[tier];
    const totalCost = tokenCost * imagesToEnhance.length;

    // Check if user has enough tokens
    const hasEnough = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      totalCost,
    );

    if (!hasEnough) {
      return NextResponse.json(
        {
          error: "Insufficient tokens",
          required: totalCost,
          toEnhance: imagesToEnhance.length,
        },
        { status: 402 },
      );
    }

    // Consume tokens upfront for the entire batch
    const batchId = `album-${albumId}-${Date.now()}`;
    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: totalCost,
      source: "album_batch_enhancement",
      sourceId: batchId,
      metadata: { tier, albumId, imageCount: imagesToEnhance.length },
    });

    if (!consumeResult.success) {
      return NextResponse.json(
        { error: consumeResult.error || "Failed to consume tokens" },
        { status: 500 },
      );
    }

    // Prepare images data for the workflow
    const imagesData = imagesToEnhance.map((ai) => ({
      imageId: ai.image.id,
      originalR2Key: ai.image.originalR2Key,
    }));

    const batchInput: BatchEnhanceInput = {
      batchId,
      userId: session.user.id,
      images: imagesData,
      tier,
    };

    if (isVercelEnvironment()) {
      // Production: Use Vercel's durable workflow infrastructure
      await start(batchEnhanceImages, [batchInput]);

      console.log("Album batch enhancement workflow started (production)", {
        batchId,
        albumId,
        imageCount: imagesToEnhance.length,
      });
    } else {
      // Development: Run enhancement directly (fire-and-forget)
      console.log("Running album batch enhancement directly (dev mode)", {
        batchId,
        albumId,
      });

      // Fire and forget - don't await, let it run in the background
      batchEnhanceImagesDirect(batchInput).catch((error) => {
        console.error("Direct album batch enhancement failed:", error);
      });
    }

    return NextResponse.json({
      success: true,
      totalImages: albumImages.length,
      skipped: skippedCount,
      queued: imagesToEnhance.length,
      totalCost,
      newBalance: consumeResult.balance,
      jobs: imagesData.map((img) => ({
        imageId: img.imageId,
        jobId: batchId, // Individual job IDs will be created by the workflow
      })),
    });
  } catch (error) {
    console.error("Error in album batch enhance API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Album batch enhancement failed",
      },
      { status: 500 },
    );
  }
}
