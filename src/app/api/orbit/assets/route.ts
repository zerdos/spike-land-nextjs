import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

/**
 * List and search assets for workspace
 * GET /api/orbit/assets?workspaceId=xxx&folderId=xxx&search=xxx&tags[]=xxx&fileType=image&page=1&limit=50
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const workspaceId = searchParams.get("workspaceId");
  const folderId = searchParams.get("folderId");
  const search = searchParams.get("search");
  const tags = searchParams.getAll("tags[]");
  const fileType = searchParams.get("fileType"); // "image" or "video"
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10),
    100,
  ); // Max 100 per page

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Missing required parameter: workspaceId" },
      { status: 400 },
    );
  }

  // Check read permission
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "asset:read"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Build where clause
  const where: {
    workspaceId: string;
    folderId?: string | null;
    filename?: { contains: string; mode: "insensitive" };
    fileType?: { startsWith: string };
    tags?: { some: { tag: { name: { in: string[] } } } };
  } = {
    workspaceId,
  };

  if (folderId !== null) {
    where.folderId = folderId || null; // Allow filtering by "no folder"
  }

  if (search) {
    where.filename = { contains: search, mode: "insensitive" };
  }

  if (fileType) {
    if (fileType === "image") {
      where.fileType = { startsWith: "image/" };
    } else if (fileType === "video") {
      where.fileType = { startsWith: "video/" };
    }
  }

  if (tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: tags },
        },
      },
    };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch assets with counts
  const [{ data: assets }, { data: totalCount }] = await Promise.all([
    tryCatch(
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              name: true,
              image: true,
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
          _count: {
            select: {
              socialPosts: true,
              scheduledPosts: true,
            },
          },
        },
      }),
    ),
    tryCatch(prisma.asset.count({ where })),
  ]);

  if (!assets || totalCount === null) {
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }

  // Build public URLs
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
  const assetsWithUrls = assets.map((asset) => ({
    ...asset,
    url: publicUrl ? `${publicUrl}/${asset.r2Key}` : null,
    usageCount: asset._count.socialPosts + asset._count.scheduledPosts,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    assets: assetsWithUrls,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}
