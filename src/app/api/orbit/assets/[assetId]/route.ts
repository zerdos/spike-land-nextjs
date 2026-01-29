import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ assetId: string }>;
}

/**
 * Get asset details with metadata, tags, and usage stats
 * GET /api/orbit/assets/[assetId]
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const session = await auth();
  const { assetId } = await context.params;

  // Fetch asset with related data
  const { data: asset, error: assetError } = await tryCatch(
    prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        folder: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
            assignedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            socialPosts: true,
            scheduledPosts: true,
          },
        },
      },
    }),
  );

  if (assetError || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check read permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, asset.workspaceId, "asset:read"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Build public URL
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
  const assetUrl = publicUrl ? `${publicUrl}/${asset.r2Key}` : null;

  // Calculate usage count
  const usageCount = asset._count.socialPosts + asset._count.scheduledPosts;

  return NextResponse.json({
    asset: {
      ...asset,
      url: assetUrl,
      usageCount,
    },
  });
}

/**
 * Update asset metadata (name, folder, tags)
 * PATCH /api/orbit/assets/[assetId]
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await auth();
  const { assetId } = await context.params;

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { filename, folderId, altText, tags } = body as {
    filename?: string;
    folderId?: string | null;
    altText?: string;
    tags?: string[]; // Array of tag names
  };

  // Fetch asset to get workspaceId
  const { data: existingAsset, error: fetchError } = await tryCatch(
    prisma.asset.findUnique({
      where: { id: assetId },
      select: { workspaceId: true, uploadedById: true },
    }),
  );

  if (fetchError || !existingAsset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check write permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(
      session,
      existingAsset.workspaceId,
      "asset:write",
    ),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Validate folder if provided
  if (folderId) {
    const { data: folder, error: folderError } = await tryCatch(
      prisma.assetFolder.findUnique({
        where: { id: folderId, workspaceId: existingAsset.workspaceId },
      }),
    );

    if (folderError || !folder) {
      return NextResponse.json(
        { error: "Invalid folder ID" },
        { status: 400 },
      );
    }
  }

  // Update asset
  const updateData: {
    filename?: string;
    folderId?: string | null;
    altText?: string;
  } = {};

  if (filename !== undefined) updateData.filename = filename;
  if (folderId !== undefined) updateData.folderId = folderId;
  if (altText !== undefined) updateData.altText = altText;

  const { data: updatedAsset, error: updateError } = await tryCatch(
    prisma.asset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        folder: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
  );

  if (updateError || !updatedAsset) {
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 },
    );
  }

  // Handle tag updates if provided
  if (tags !== undefined && Array.isArray(tags)) {
    // Remove existing tag assignments
    await tryCatch(
      prisma.assetTagAssignment.deleteMany({
        where: { assetId },
      }),
    );

    // Create new tag assignments
    for (const tagName of tags) {
      const normalizedTagName = tagName.toLowerCase().trim();
      if (!normalizedTagName) continue;

      // Upsert tag
      const { data: tag } = await tryCatch(
        prisma.assetTag.upsert({
          where: {
            workspaceId_name: {
              workspaceId: existingAsset.workspaceId,
              name: normalizedTagName,
            },
          },
          create: {
            workspaceId: existingAsset.workspaceId,
            name: normalizedTagName,
          },
          update: {},
        }),
      );

      if (tag) {
        // Create tag assignment
        await tryCatch(
          prisma.assetTagAssignment.create({
            data: {
              assetId,
              tagId: tag.id,
              assignedById: session!.user!.id,
            },
          }),
        );
      }
    }

    // Refetch asset with updated tags
    const { data: refreshedAsset } = await tryCatch(
      prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          folder: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    );

    if (refreshedAsset) {
      const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
      const assetUrl = publicUrl
        ? `${publicUrl}/${refreshedAsset.r2Key}`
        : null;

      return NextResponse.json({
        asset: {
          ...refreshedAsset,
          url: assetUrl,
        },
      });
    }
  }

  // Build public URL
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
  const assetUrl = publicUrl ? `${publicUrl}/${updatedAsset.r2Key}` : null;

  return NextResponse.json({
    asset: {
      ...updatedAsset,
      url: assetUrl,
    },
  });
}

/**
 * Delete asset from R2 and database
 * DELETE /api/orbit/assets/[assetId]
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const session = await auth();
  const { assetId } = await context.params;

  // Fetch asset to get workspaceId and r2Key
  const { data: asset, error: fetchError } = await tryCatch(
    prisma.asset.findUnique({
      where: { id: assetId },
      select: { workspaceId: true, r2Key: true },
    }),
  );

  if (fetchError || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Check delete permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, asset.workspaceId, "asset:delete"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Delete from R2
  const { error: r2Error } = await tryCatch(deleteFromR2(asset.r2Key));

  if (r2Error) {
    console.error("Failed to delete asset from R2:", r2Error);
    // Continue with database deletion even if R2 delete fails
  }

  // Delete from database (cascade will handle related records)
  const { error: deleteError } = await tryCatch(
    prisma.asset.delete({
      where: { id: assetId },
    }),
  );

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
