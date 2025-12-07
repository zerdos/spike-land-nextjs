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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageIds, tier } = body as {
      imageIds: string[];
      tier: EnhancementTier;
    };

    // Validate input
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid imageIds" },
        { status: 400 },
      );
    }

    if (imageIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} images allowed per batch enhancement` },
        { status: 400 },
      );
    }

    if (!tier || !Object.keys(ENHANCEMENT_COSTS).includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Validate all images belong to user
    const images = await prisma.enhancedImage.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
      },
    });

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: "One or more images not found or unauthorized" },
        { status: 404 },
      );
    }

    // Calculate total cost
    const tokenCost = ENHANCEMENT_COSTS[tier];
    const totalCost = tokenCost * imageIds.length;

    // Check if user has enough tokens
    const hasEnough = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      totalCost,
    );

    if (!hasEnough) {
      return NextResponse.json(
        { error: "Insufficient tokens", required: totalCost },
        { status: 402 },
      );
    }

    // Consume tokens upfront for the entire batch
    const batchId = `batch-${Date.now()}`;
    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: totalCost,
      source: "batch_image_enhancement",
      sourceId: batchId,
      metadata: { tier, imageCount: imageIds.length },
    });

    if (!consumeResult.success) {
      return NextResponse.json(
        { error: consumeResult.error || "Failed to consume tokens" },
        { status: 500 },
      );
    }

    // Prepare images data for the workflow
    const imagesData = images.map((image) => ({
      imageId: image.id,
      originalR2Key: image.originalR2Key,
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

      console.log("Batch enhancement workflow started (production)", {
        batchId,
        imageCount: imageIds.length,
      });
    } else {
      // Development: Run enhancement directly (fire-and-forget)
      // The workflow infrastructure doesn't fully execute in dev mode
      console.log("Running batch enhancement directly (dev mode)", { batchId });

      // Fire and forget - don't await, let it run in the background
      batchEnhanceImagesDirect(batchInput).catch((error) => {
        console.error("Direct batch enhancement failed:", error);
      });
    }

    return NextResponse.json({
      success: true,
      batchId,
      summary: {
        total: imageIds.length,
        totalCost,
        newBalance: consumeResult.balance,
      },
    });
  } catch (error) {
    console.error("Error in batch enhance API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Batch enhancement failed",
      },
      { status: 500 },
    );
  }
}
