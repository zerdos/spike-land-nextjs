import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; }>; };

// POST /api/albums/[id]/images - Add images to album
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check album ownership
  const { data: album, error: albumError } = await tryCatch(
    prisma.album.findUnique({
      where: { id: albumId },
      select: { userId: true },
    }),
  );

  if (albumError) {
    console.error("Failed to add images to album:", albumError);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  if (album.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Failed to add images to album:", bodyError);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }

  const { imageIds } = body;

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json(
      { error: "Image IDs are required" },
      { status: 400 },
    );
  }

  // Verify all images belong to the user
  const { data: images, error: imagesError } = await tryCatch(
    prisma.enhancedImage.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
      },
      select: { id: true },
    }),
  );

  if (imagesError) {
    console.error("Failed to add images to album:", imagesError);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }

  if (images.length !== imageIds.length) {
    return NextResponse.json(
      { error: "Some images were not found or do not belong to you" },
      { status: 400 },
    );
  }

  // Get current max sort order in album
  const { data: maxSortOrder, error: maxSortOrderError } = await tryCatch(
    prisma.albumImage.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    }),
  );

  if (maxSortOrderError) {
    console.error("Failed to add images to album:", maxSortOrderError);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }

  // Pre-calculate sort orders to avoid race condition in Promise.all
  const baseSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  const sortOrders = Object.fromEntries(
    imageIds.map((id, idx) => [id, baseSortOrder + idx]),
  );

  // Add images to album (skip duplicates)
  const { data: results, error: resultsError } = await tryCatch(
    Promise.all(
      imageIds.map(async (imageId: string) => {
        const sortOrder = sortOrders[imageId]; // Pre-calculated, immutable
        const { data: albumImage, error: createError } = await tryCatch(
          prisma.albumImage.create({
            data: {
              albumId,
              imageId,
              sortOrder,
            },
          }),
        );

        if (createError) {
          // Unique constraint violation - image already in album
          if (
            createError &&
            typeof createError === "object" &&
            "code" in createError &&
            createError.code === "P2002"
          ) {
            return { imageId, success: false, reason: "already_in_album" };
          }
          throw createError;
        }

        return { imageId, success: true, albumImageId: albumImage.id };
      }),
    ),
  );

  if (resultsError) {
    console.error("Failed to add images to album:", resultsError);
    return NextResponse.json(
      { error: "Failed to add images to album" },
      { status: 500 },
    );
  }

  const added = results.filter((r) => r.success).length;

  return NextResponse.json({
    success: true,
    added,
    results,
  });
}

// DELETE /api/albums/[id]/images - Remove images from album
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check album ownership
  const { data: album, error: albumError } = await tryCatch(
    prisma.album.findUnique({
      where: { id: albumId },
      select: { userId: true, coverImageId: true },
    }),
  );

  if (albumError) {
    console.error("Failed to remove images from album:", albumError);
    return NextResponse.json(
      { error: "Failed to remove images from album" },
      { status: 500 },
    );
  }

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  if (album.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Failed to remove images from album:", bodyError);
    return NextResponse.json(
      { error: "Failed to remove images from album" },
      { status: 500 },
    );
  }

  const { imageIds } = body;

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json(
      { error: "Image IDs are required" },
      { status: 400 },
    );
  }

  // Remove images from album
  const { data: result, error: deleteError } = await tryCatch(
    prisma.albumImage.deleteMany({
      where: {
        albumId,
        imageId: { in: imageIds },
      },
    }),
  );

  if (deleteError) {
    console.error("Failed to remove images from album:", deleteError);
    return NextResponse.json(
      { error: "Failed to remove images from album" },
      { status: 500 },
    );
  }

  // If cover image was removed, clear the cover
  if (album.coverImageId && imageIds.includes(album.coverImageId)) {
    const { error: updateError } = await tryCatch(
      prisma.album.update({
        where: { id: albumId },
        data: { coverImageId: null },
      }),
    );

    if (updateError) {
      console.error("Failed to remove images from album:", updateError);
      return NextResponse.json(
        { error: "Failed to remove images from album" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    removed: result.count,
  });
}

// PATCH /api/albums/[id]/images - Reorder images in album
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: albumId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check album ownership
  const { data: album, error: albumError } = await tryCatch(
    prisma.album.findUnique({
      where: { id: albumId },
      select: { userId: true },
    }),
  );

  if (albumError) {
    console.error("Failed to reorder images:", albumError);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 },
    );
  }

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  if (album.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Failed to reorder images:", bodyError);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 },
    );
  }

  const { imageOrder } = body;

  if (!Array.isArray(imageOrder)) {
    return NextResponse.json(
      { error: "Image order array is required" },
      { status: 400 },
    );
  }

  // Update sort order for each image
  const { error: transactionError } = await tryCatch(
    prisma.$transaction(
      imageOrder.map((imageId: string, index: number) =>
        prisma.albumImage.updateMany({
          where: { albumId, imageId },
          data: { sortOrder: index },
        })
      ),
    ),
  );

  if (transactionError) {
    console.error("Failed to reorder images:", transactionError);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
