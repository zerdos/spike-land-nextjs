/**
 * Featured Gallery Management API Route
 *
 * CRUD operations for featured gallery items (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { GalleryCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
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
    const {
      title,
      description,
      category,
      sourceImageId,
      sourceJobId,
      width,
      height,
      sortOrder,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 },
      );
    }

    if (!sourceImageId || !sourceJobId) {
      return NextResponse.json(
        { error: "Missing required fields: sourceImageId and sourceJobId" },
        { status: 400 },
      );
    }

    if (category && !Object.values(GalleryCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid gallery category" },
        { status: 400 },
      );
    }

    // Fetch the source image and job to get URLs
    const [sourceImage, sourceJob] = await Promise.all([
      prisma.enhancedImage.findUnique({
        where: { id: sourceImageId },
        select: { originalUrl: true },
      }),
      prisma.imageEnhancementJob.findUnique({
        where: { id: sourceJobId },
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
        title,
        description: description || null,
        category: category || GalleryCategory.PORTRAIT,
        originalUrl: sourceImage.originalUrl,
        enhancedUrl: sourceJob.enhancedUrl,
        width: width || 16,
        height: height || 9,
        sourceImageId,
        sourceJobId,
        sortOrder: sortOrder ?? 0,
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
    const { id, title, description, category, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    if (category && !Object.values(GalleryCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid gallery category" },
        { status: 400 },
      );
    }

    const data: {
      title?: string;
      description?: string | null;
      category?: GalleryCategory;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (category !== undefined) data.category = category;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const item = await prisma.featuredGalleryItem.update({
      where: { id },
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

    if (!itemId) {
      return NextResponse.json(
        { error: "Gallery item ID required" },
        { status: 400 },
      );
    }

    await prisma.featuredGalleryItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gallery item:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
