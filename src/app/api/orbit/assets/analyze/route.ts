import { auth } from "@/auth";
import { analyzeAssetForLibrary } from "@/lib/ai/gemini-client";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { downloadFromR2 } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Trigger AI analysis for asset (alt text + quality scoring + tagging)
 * POST /api/orbit/assets/analyze
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { assetId } = body as { assetId: string; };

  if (!assetId) {
    return NextResponse.json(
      { error: "Missing required field: assetId" },
      { status: 400 },
    );
  }

  // Fetch asset
  const { data: asset, error: assetError } = await tryCatch(
    prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        workspaceId: true,
        r2Key: true,
        fileType: true,
        uploadedById: true,
      },
    }),
  );

  if (assetError || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check analyze permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, asset.workspaceId, "asset:analyze"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Only analyze images (not videos)
  if (!asset.fileType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Analysis is only supported for images" },
      { status: 400 },
    );
  }

  // Download image from R2
  const { data: imageBuffer, error: downloadError } = await tryCatch(
    downloadFromR2(asset.r2Key),
  );

  if (downloadError || !imageBuffer) {
    return NextResponse.json(
      { error: "Failed to download asset from storage" },
      { status: 500 },
    );
  }

  // Run AI analysis
  const { data: analysis, error: analysisError } = await tryCatch(
    analyzeAssetForLibrary(imageBuffer, asset.fileType),
  );

  if (analysisError || !analysis) {
    return NextResponse.json(
      {
        error: analysisError instanceof Error
          ? analysisError.message
          : "Analysis failed",
      },
      { status: 500 },
    );
  }

  // Update asset with AI results
  const { data: updatedAsset, error: updateError } = await tryCatch(
    prisma.asset.update({
      where: { id: assetId },
      data: {
        altText: analysis.altText,
        qualityScore: analysis.qualityScore,
        analysisJson: JSON.parse(JSON.stringify(analysis)),
      },
    }),
  );

  if (updateError || !updatedAsset) {
    return NextResponse.json(
      { error: "Failed to update asset with analysis results" },
      { status: 500 },
    );
  }

  // Create/update tags
  const tagResults = [];
  for (const tagName of analysis.suggestedTags) {
    const normalizedTagName = tagName.toLowerCase().trim();
    if (!normalizedTagName) continue;

    // Upsert tag
    const { data: tag } = await tryCatch(
      prisma.assetTag.upsert({
        where: {
          workspaceId_name: {
            workspaceId: asset.workspaceId,
            name: normalizedTagName,
          },
        },
        create: {
          workspaceId: asset.workspaceId,
          name: normalizedTagName,
        },
        update: {},
      }),
    );

    if (tag) {
      // Create tag assignment (skip if already exists)
      const { data: assignment } = await tryCatch(
        prisma.assetTagAssignment.upsert({
          where: {
            assetId_tagId: {
              assetId,
              tagId: tag.id,
            },
          },
          create: {
            assetId,
            tagId: tag.id,
            assignedById: session?.user?.id ?? "",
          },
          update: {},
        }),
      );

      if (assignment) {
        tagResults.push({
          id: tag.id,
          name: tag.name,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    analysis: {
      altText: analysis.altText,
      qualityScore: analysis.qualityScore,
      suggestedTags: analysis.suggestedTags,
      analysisDetails: analysis.analysisDetails,
    },
    appliedTags: tagResults,
  });
}
