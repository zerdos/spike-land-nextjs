/**
 * Featured Gallery Management API Route
 *
 * CRUD operations for featured gallery items (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import {
  createGalleryItemSchema,
  deleteItemSchema,
  GALLERY_CONSTANTS,
  updateGalleryItemSchema,
} from "@/lib/types/gallery";
import { GalleryCategory } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(
        parseInt(
          searchParams.get("limit") ||
            String(GALLERY_CONSTANTS.DEFAULT_PAGE_SIZE),
          10,
        ),
        GALLERY_CONSTANTS.MAX_PAGE_SIZE,
      ),
    );
    const category = searchParams.get("category") as GalleryCategory | null;
    const isActiveParam = searchParams.get("isActive");

    const where: {
      category?: GalleryCategory;
      isActive?: boolean;
    } = {};

    if (category && Object.values(GalleryCategory).includes(category)) {
      where.category = category;
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    const [items, total] = await Promise.all([
      prisma.featuredGalleryItem.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sourceImage: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
          sourceJob: {
            select: {
              id: true,
              tier: true,
              status: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.featuredGalleryItem.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        originalUrl: item.originalUrl,
        enhancedUrl: item.enhancedUrl,
        width: item.width,
        height: item.height,
        sourceImageId: item.sourceImageId,
        sourceJobId: item.sourceJobId,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        creator: item.creator,
        sourceImage: item.sourceImage,
        sourceJob: item.sourceJob,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch gallery items:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();

    // Validate request body with Zod
    const validatedData = createGalleryItemSchema.parse(body);

    // Fetch the source image and job to get URLs
    const [sourceImage, sourceJob] = await Promise.all([
      prisma.enhancedImage.findUnique({
        where: { id: validatedData.sourceImageId },
        select: { originalUrl: true },
      }),
      prisma.imageEnhancementJob.findUnique({
        where: { id: validatedData.sourceJobId },
        select: { enhancedUrl: true },
      }),
    ]);

    if (!sourceImage || !sourceJob?.enhancedUrl) {
      return NextResponse.json(
        { error: "Source image or enhancement job not found" },
        { status: 404 },
      );
    }

    const item = await prisma.featuredGalleryItem.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        category: validatedData.category,
        originalUrl: sourceImage.originalUrl,
        enhancedUrl: sourceJob.enhancedUrl,
        width: validatedData.width || 16,
        height: validatedData.height || 9,
        sourceImageId: validatedData.sourceImageId,
        sourceJobId: validatedData.sourceJobId,
        sortOrder: validatedData.sortOrder ?? 0,
        isActive: true,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Revalidate gallery cache tag
    revalidateTag("gallery", "max");

    return NextResponse.json({
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        originalUrl: item.originalUrl,
        enhancedUrl: item.enhancedUrl,
        width: item.width,
        height: item.height,
        sourceImageId: item.sourceImageId,
        sourceJobId: item.sourceJobId,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        creator: item.creator,
      },
    });
  } catch (error) {
    console.error("Failed to create gallery item:", error);
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();

    // Validate request body with Zod
    const validatedData = updateGalleryItemSchema.parse(body);

    const data: {
      title?: string;
      description?: string | null;
      category?: GalleryCategory;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (validatedData.title !== undefined) data.title = validatedData.title;
    if (validatedData.description !== undefined) {
      data.description = validatedData.description || null;
    }
    if (validatedData.category !== undefined) {
      data.category = validatedData.category;
    }
    if (validatedData.sortOrder !== undefined) {
      data.sortOrder = validatedData.sortOrder;
    }
    if (validatedData.isActive !== undefined) {
      data.isActive = validatedData.isActive;
    }

    const item = await prisma.featuredGalleryItem.update({
      where: { id: validatedData.id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Revalidate gallery cache tag
    revalidateTag("gallery", "max");

    return NextResponse.json({
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        originalUrl: item.originalUrl,
        enhancedUrl: item.enhancedUrl,
        width: item.width,
        height: item.height,
        sourceImageId: item.sourceImageId,
        sourceJobId: item.sourceJobId,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        creator: item.creator,
      },
    });
  } catch (error) {
    console.error("Failed to update gallery item:", error);
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");

    // Validate the ID parameter with Zod
    const validatedData = deleteItemSchema.parse({ id: itemId });

    await prisma.featuredGalleryItem.delete({
      where: { id: validatedData.id },
    });

    // Revalidate gallery cache tag
    revalidateTag("gallery", "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gallery item:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Gallery item ID required", details: error.issues },
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
