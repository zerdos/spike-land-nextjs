import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/images/move-to-album - Move images to an album
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageIds, targetAlbumId, removeFromSourceAlbum } = body;

    // Validate input
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs are required" },
        { status: 400 },
      );
    }

    if (!targetAlbumId || typeof targetAlbumId !== "string") {
      return NextResponse.json(
        { error: "Target album ID is required" },
        { status: 400 },
      );
    }

    // Verify target album exists and belongs to user
    const targetAlbum = await prisma.album.findUnique({
      where: { id: targetAlbumId },
      select: { userId: true },
    });

    if (!targetAlbum) {
      return NextResponse.json(
        { error: "Target album not found" },
        { status: 404 },
      );
    }

    if (targetAlbum.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to add images to this album" },
        { status: 403 },
      );
    }

    // Verify all images belong to the user
    const images = await prisma.enhancedImage.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: "Some images were not found or do not belong to you" },
        { status: 400 },
      );
    }

    // If removing from source album, verify user owns that album too
    if (removeFromSourceAlbum && typeof removeFromSourceAlbum === "string") {
      const sourceAlbum = await prisma.album.findUnique({
        where: { id: removeFromSourceAlbum },
        select: { userId: true },
      });

      if (!sourceAlbum) {
        return NextResponse.json(
          { error: "Source album not found" },
          { status: 404 },
        );
      }

      if (sourceAlbum.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You do not have permission to remove images from the source album" },
          { status: 403 },
        );
      }
    }

    // Get current max sort order in target album
    const maxSortOrder = await prisma.albumImage.aggregate({
      where: { albumId: targetAlbumId },
      _max: { sortOrder: true },
    });

    let currentSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Process each image
    const results = await Promise.all(
      imageIds.map(async (imageId: string) => {
        try {
          // Add to target album (use upsert to handle duplicates gracefully)
          const albumImage = await prisma.albumImage.upsert({
            where: {
              albumId_imageId: {
                albumId: targetAlbumId,
                imageId,
              },
            },
            update: {
              // If already exists, just update the sort order
              sortOrder: currentSortOrder,
            },
            create: {
              albumId: targetAlbumId,
              imageId,
              sortOrder: currentSortOrder,
            },
          });

          // Increment sort order for next image
          currentSortOrder++;

          // Remove from source album if requested
          if (removeFromSourceAlbum && typeof removeFromSourceAlbum === "string") {
            await prisma.albumImage.deleteMany({
              where: {
                albumId: removeFromSourceAlbum,
                imageId,
              },
            });
          }

          return {
            imageId,
            success: true,
            albumImageId: albumImage.id,
            alreadyInAlbum: albumImage.addedAt < new Date(Date.now() - 1000), // Check if existed before
          };
        } catch (error) {
          console.error(`Failed to move image ${imageId}:`, error);
          return {
            imageId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    const moved = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const alreadyInAlbum = results.filter((r) => r.success && r.alreadyInAlbum).length;

    return NextResponse.json({
      success: true,
      moved,
      failed,
      alreadyInAlbum,
      results,
    });
  } catch (error) {
    console.error("Failed to move images to album:", error);
    return NextResponse.json(
      { error: "Failed to move images to album" },
      { status: 500 },
    );
  }
}
