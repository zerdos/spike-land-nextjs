/**
 * Reorder Gallery Items API Route
 *
 * Bulk update sort order for gallery items (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { reorderItemsSchema } from "@/lib/types/gallery";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

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

    // Revalidate the homepage cache
    revalidatePath("/");

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
