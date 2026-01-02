/**
 * Reorder Gallery Items API Route
 *
 * Bulk update sort order for gallery items (admin only).
 * POST: Single-item reorder (swap positions atomically)
 * PATCH: Bulk reorder (update multiple items)
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { reorderItemsSchema, singleReorderSchema } from "@/lib/types/gallery";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

function handleError(
  error: Error,
  context: string,
  checkNotFound = false,
): NextResponse {
  console.error(`Failed to ${context}:`, error);
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 },
    );
  }
  if (checkNotFound && error.message === "Item not found") {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (error.message.includes("Forbidden")) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Handler for single-item reorder
 * Client sends { id, newOrder } to move item to a new position
 * Uses atomic swap to prevent race conditions
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "reorder gallery item");
  }

  const body = await request.json();

  // Validate request body with Zod
  const validatedData = singleReorderSchema.parse(body);

  // Perform atomic swap in a transaction
  await prisma.$transaction(async (tx) => {
    // Get current item
    const currentItem = await tx.featuredGalleryItem.findUnique({
      where: { id: validatedData.id },
      select: { sortOrder: true },
    });

    if (!currentItem) {
      throw new Error("Item not found");
    }

    const oldOrder = currentItem.sortOrder;
    const newOrder = validatedData.newOrder;

    if (oldOrder === newOrder) {
      return; // No change needed
    }

    // Find the item currently at the target position
    const targetItem = await tx.featuredGalleryItem.findFirst({
      where: { sortOrder: newOrder },
      select: { id: true },
    });

    if (targetItem) {
      // Swap: move target item to current item's position
      await tx.featuredGalleryItem.update({
        where: { id: targetItem.id },
        data: { sortOrder: oldOrder },
      });
    }

    // Move current item to new position
    await tx.featuredGalleryItem.update({
      where: { id: validatedData.id },
      data: { sortOrder: newOrder },
    });
  });

  // Revalidate gallery cache tag
  revalidateTag("gallery", "max");

  return NextResponse.json({
    success: true,
    updated: 1,
  });
}

/**
 * Handler for bulk reorder
 * Accepts { items: [{ id, sortOrder }] } for bulk updates
 */
async function patchHandler(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "reorder gallery items");
  }

  const body = await request.json();

  // Validate request body with Zod
  const validatedData = reorderItemsSchema.parse(body);

  // Update all items in a transaction
  await prisma.$transaction(
    validatedData.items.map((item) =>
      prisma.featuredGalleryItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    ),
  );

  // Revalidate gallery cache tag
  revalidateTag("gallery", "max");

  return NextResponse.json({
    success: true,
    updated: validatedData.items.length,
  });
}

export async function POST(request: NextRequest) {
  const { data, error } = await tryCatch(postHandler(request));
  if (error) {
    return handleError(error, "reorder gallery item", true);
  }
  return data;
}

export async function PATCH(request: NextRequest) {
  const { data, error } = await tryCatch(patchHandler(request));
  if (error) {
    return handleError(error, "reorder gallery items");
  }
  return data;
}
