/**
 * Reorder Gallery Items API Route
 *
 * Bulk update sort order for gallery items (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface ReorderItem {
  id: string;
  sortOrder: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
    const { items } = body as { items?: ReorderItem[]; };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid items array" },
        { status: 400 },
      );
    }

    // Validate that all items have required fields
    for (const item of items) {
      if (!item.id || typeof item.sortOrder !== "number") {
        return NextResponse.json(
          { error: "Each item must have id and sortOrder" },
          { status: 400 },
        );
      }
    }

    // Update all items in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.featuredGalleryItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      ),
    );

    return NextResponse.json({
      success: true,
      updated: items.length,
    });
  } catch (error) {
    console.error("Failed to reorder gallery items:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
