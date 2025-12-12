import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; }>; };

// POST /api/albums/[id]/images - Add images to album
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check album ownership
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

    const body = await request.json();
    const { imageIds } = body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs are required" },
        { status: 400 },
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

    // Get current max sort order in album
    const maxSortOrder = await prisma.albumImage.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    });

    // Pre-calculate sort orders to avoid race condition in Promise.all
    const baseSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    const sortOrders = Object.fromEntries(
      imageIds.map((id, idx) => [id, baseSortOrder + idx]),
    );

    // Add images to album (skip duplicates)
    const results = await Promise.all(
      imageIds.map(async (imageId: string) => {
        const sortOrder = sortOrders[imageId]; // Pre-calculated, immutable
        try {
          const albumImage = await prisma.albumImage.create({
            data: {
              albumId,
              imageId,
              sortOrder,
            },
          });
          return { imageId, success: true, albumImageId: albumImage.id };
        } catch (error) {
          // Unique constraint violation - image already in album
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            return { imageId, success: false, reason: "already_in_album" };
          }
          throw error;
        }
      }),
    );

    const added = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      added,
      results,
    });
  } catch (error) {
    console.error("Failed to add images to album:", error);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }
}

// DELETE /api/albums/[id]/images - Remove images from album
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check album ownership
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { userId: true, coverImageId: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { imageIds } = body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Image IDs are required" },
        { status: 400 },
      );
    }

    // Remove images from album
    const result = await prisma.albumImage.deleteMany({
      where: {
        albumId,
        imageId: { in: imageIds },
      },
    });

    // If cover image was removed, clear the cover
    if (album.coverImageId && imageIds.includes(album.coverImageId)) {
      await prisma.album.update({
        where: { id: albumId },
        data: { coverImageId: null },
      });
    }

    return NextResponse.json({
      success: true,
      removed: result.count,
    });
  } catch (error) {
    console.error("Failed to remove images from album:", error);
    return NextResponse.json(
      { error: "Failed to remove images from album" },
      { status: 500 },
    );
  }
}

// PATCH /api/albums/[id]/images - Reorder images in album
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check album ownership
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

    const body = await request.json();
    const { imageOrder } = body;

    if (!Array.isArray(imageOrder)) {
      return NextResponse.json(
        { error: "Image order array is required" },
        { status: 400 },
      );
    }

    // Update sort order for each image
    await prisma.$transaction(
      imageOrder.map((imageId: string, index: number) =>
        prisma.albumImage.updateMany({
          where: { albumId, imageId },
          data: { sortOrder: index },
        })
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 },
    );
  }
}
