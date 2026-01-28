/**
 * Scout Competitor Individual Resource API
 *
 * Provides endpoints for reading, updating, and deleting individual competitors.
 *
 * Resolves #871
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { updateCompetitorRequestSchema } from "@/lib/validations/scout-competitor";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; id: string; }>;
}

// GET - Fetches a single competitor with posts and metrics
export async function GET(_request: Request, { params }: RouteParams) {
  const { workspaceSlug, id } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    // Find competitor with posts and count
    const competitor = await prisma.scoutCompetitor.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
      include: {
        posts: {
          orderBy: { postedAt: "desc" },
          take: 10,
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, {
        status: 404,
      });
    }

    // Calculate metrics from posts
    const totalLikes = competitor.posts.reduce(
      (sum, p) => sum + (p.likes || 0),
      0,
    );
    const totalComments = competitor.posts.reduce(
      (sum, p) => sum + (p.comments || 0),
      0,
    );
    const totalShares = competitor.posts.reduce(
      (sum, p) => sum + (p.shares || 0),
      0,
    );
    const averageEngagement = competitor.posts.length > 0
      ? (totalLikes + totalComments + totalShares) / competitor.posts.length
      : 0;

    // Transform response
    const result = {
      id: competitor.id,
      workspaceId: competitor.workspaceId,
      platform: competitor.platform,
      handle: competitor.handle,
      name: competitor.name,
      isActive: competitor.isActive,
      createdAt: competitor.createdAt,
      updatedAt: competitor.updatedAt,
      metrics: {
        postsTracked: competitor._count.posts,
        totalLikes,
        totalComments,
        totalShares,
        averageEngagement,
      },
      recentPosts: competitor.posts.map((post) => ({
        id: post.id,
        content: post.content && post.content.length > 200
          ? post.content.substring(0, 200) + "..."
          : post.content,
        postedAt: post.postedAt,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch competitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

// PUT - Updates a competitor
export async function PUT(request: Request, { params }: RouteParams) {
  const { workspaceSlug, id } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    // Verify competitor belongs to the workspace
    const existingCompetitor = await prisma.scoutCompetitor.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!existingCompetitor) {
      return NextResponse.json({ error: "Competitor not found" }, {
        status: 404,
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateCompetitorRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    // Build update data (only include provided fields)
    const updateData: { name?: string; isActive?: boolean; } = {};
    if (parseResult.data.name !== undefined) {
      updateData.name = parseResult.data.name;
    }
    if (parseResult.data.isActive !== undefined) {
      updateData.isActive = parseResult.data.isActive;
    }

    // Update competitor
    const updatedCompetitor = await prisma.scoutCompetitor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.error("Failed to update competitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

// DELETE - Removes a competitor from a workspace
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { workspaceSlug, id } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    // Verify competitor belongs to the workspace before deleting
    const competitor = await prisma.scoutCompetitor.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, {
        status: 404,
      });
    }

    // Delete competitor (posts will be cascade deleted by Prisma schema)
    await prisma.scoutCompetitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete competitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
