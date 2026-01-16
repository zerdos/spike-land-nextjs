import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: {
    workspaceSlug: string;
  };
}

// List all monitoring results for a workspace
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: params.workspaceSlug,
        members: { some: { userId: session.user.id } },
      },
      select: { id: true },
    });

    if (!workspace) return new Response("Workspace not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId");
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = (page - 1) * limit;

    const where: Prisma.ScoutResultWhereInput = {
      topic: {
        workspaceId: workspace.id,
      },
    };

    if (topicId) where.topicId = topicId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (platform) where.platform = platform as any;

    const results = await prisma.scoutResult.findMany({
      where,
      orderBy: { foundAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        topic: {
          select: { name: true },
        },
      },
    });

    const totalResults = await prisma.scoutResult.count({ where });

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total: totalResults,
        totalPages: Math.ceil(totalResults / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /monitor:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
