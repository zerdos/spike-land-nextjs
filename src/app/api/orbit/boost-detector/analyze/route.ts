/**
 * Boost Detector Analyze API
 *
 * Triggers analysis of organic posts to identify top performers
 *
 * POST /api/orbit/boost-detector/analyze
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { analyzeWorkspacePosts } from "@/lib/orbit/boost-detector/boost-detector-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceSlug } = body;

    if (!workspaceSlug) {
      return NextResponse.json(
        { error: "workspaceSlug is required" },
        { status: 400 },
      );
    }

    // Get workspace and verify access
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    // Run analysis
    const topPerformerIds = await analyzeWorkspacePosts(workspace.id);

    // Fetch full details of top performers
    const topPerformers = await db.organicPostPerformance.findMany({
      where: {
        socialPostId: {
          in: topPerformerIds,
        },
      },
      include: {
        socialPost: {
          include: {
            postAccounts: {
              include: {
                account: true,
              },
            },
          },
        },
      },
      orderBy: {
        performanceScore: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      topPerformersCount: topPerformerIds.length,
      topPerformers,
    });
  } catch (error) {
    console.error("Error analyzing posts:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze posts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
