/**
 * Assets List API Route
 *
 * GET /api/orbit/assets - List and search assets for workspace
 */

import { auth } from "@/auth";
import logger from "@/lib/logger";
import { hasPermission } from "@/lib/permissions/permissions";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const folderId = searchParams.get("folderId");
    const search = searchParams.get("search");
    const fileType = searchParams.get("fileType");
    const tags = searchParams.getAll("tags");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE,
    );

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    // Check workspace membership and permissions
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }

    if (!hasPermission(membership.role, "asset:read")) {
      return NextResponse.json(
        { error: "Insufficient permissions to view assets" },
        { status: 403 },
      );
    }

    // Build Prisma where clause
    const where: {
      workspaceId: string;
      folderId?: string;
      filename?: { contains: string; mode: "insensitive"; };
      fileType?: { startsWith: string; };
      tags?: {
        some: {
          tag: {
            name: {
              in: string[];
            };
          };
        };
      };
    } = {
      workspaceId,
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (search) {
      where.filename = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (fileType) {
      where.fileType = {
        startsWith: fileType,
      };
    }

    if (tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: {
              in: tags,
            },
          },
        },
      };
    }

    // Count total assets matching filters
    const total = await prisma.asset.count({ where });

    // Fetch paginated assets
    const assets = await prisma.asset.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            socialPosts: true,
            scheduledPosts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Construct public URLs
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();

    const formattedAssets = assets.map((asset) => ({
      id: asset.id,
      workspaceId: asset.workspaceId,
      folderId: asset.folderId,
      folder: asset.folder,
      filename: asset.filename,
      fileType: asset.fileType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      url: publicUrl ? `${publicUrl}/${asset.r2Key}` : "",
      altText: asset.altText,
      qualityScore: asset.qualityScore,
      uploadedBy: asset.uploadedBy,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      tags: asset.tags.map((t) => t.tag),
      usage: {
        posts: asset._count.socialPosts,
        scheduledPosts: asset._count.scheduledPosts,
        total: asset._count.socialPosts + asset._count.scheduledPosts,
      },
    }));

    return NextResponse.json({
      assets: formattedAssets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    logger.error("Failed to list assets:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
