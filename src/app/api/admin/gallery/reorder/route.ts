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
import { reorderItemsSchema, singleReorderSchema } from "@/lib/types/gallery";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * POST handler for single-item reorder
 * Client sends { id, newOrder } to move item to a new position
 * Uses atomic swap to prevent race conditions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

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
  } catch (error) {
    console.error("Failed to reorder gallery item:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "Item not found") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH handler for bulk reorder
 * Accepts { items: [{ id, sortOrder }] } for bulk updates
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

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
  } catch (error) {
    console.error("Failed to reorder gallery items:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
