/**
 * API route for generating copy variants
 * POST /api/variant-generator/copy
 *
 * Resolves #551
 */

import { NextResponse } from "next/server";
import { generateCopyVariants } from "@/lib/variant-generator";
import logger from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import type { VariantGenerationParams } from "@/types/variant-generator";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<VariantGenerationParams>;

    // Validate required fields
    if (!body.seedContent) {
      return NextResponse.json(
        { error: "seedContent is required" },
        { status: 400 },
      );
    }

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    if (!body.count || body.count < 1 || body.count > 10) {
      return NextResponse.json(
        { error: "count must be between 1 and 10" },
        { status: 400 },
      );
    }

    const params: VariantGenerationParams = {
      seedContent: body.seedContent,
      workspaceId: body.workspaceId,
      count: body.count,
      tones: body.tones,
      lengths: body.lengths,
      ctaStyles: body.ctaStyles,
      targetAudience: body.targetAudience,
      briefId: body.briefId,
    };

    logger.info("[API] Generating copy variants", {
      workspaceId: params.workspaceId,
      count: params.count,
    });

    const { data: variants, error } = await tryCatch(
      generateCopyVariants(params),
    );

    if (error) {
      logger.error("[API] Failed to generate variants:", { error });
      return NextResponse.json(
        {
          error: "Failed to generate variants",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      variants,
      count: variants.length,
    });
  } catch (error) {
    logger.error("[API] Unexpected error in copy generation:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
