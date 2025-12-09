/**
 * Public Gallery API Route
 *
 * Returns active featured gallery items for the landing page (no auth required).
 */

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const items = await prisma.featuredGalleryItem.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        originalUrl: true,
        enhancedUrl: true,
        width: true,
        height: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      {
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          originalUrl: item.originalUrl,
          enhancedUrl: item.enhancedUrl,
          width: item.width,
          height: item.height,
          sortOrder: item.sortOrder,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch gallery items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
