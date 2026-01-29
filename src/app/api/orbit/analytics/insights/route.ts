/**
 * Insights API
 *
 * GET /api/orbit/analytics/insights - List insights
 * PATCH /api/orbit/analytics/insights - Update insight status
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  generateWorkspaceInsights,
  getWorkspaceInsights,
  storeInsights,
} from "@/lib/orbit/analytics/insight-generator";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const status = searchParams.get("status") || undefined;

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

    // Get insights
    const insights = await getWorkspaceInsights(workspace.id, status);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch insights",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { insightId, status } = body;

    if (!insightId || !status) {
      return NextResponse.json(
        { error: "insightId and status are required" },
        { status: 400 },
      );
    }

    // Get insight and verify access
    const insight = await db.boostInsight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 },
      );
    }

    const workspace = await db.workspace.findUnique({
      where: { id: insight.workspaceId },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update insight status
    const updatedInsight = await db.boostInsight.update({
      where: { id: insightId },
      data: {
        status: status as any,
        ...(status === "DISMISSED" && {
          dismissedAt: new Date(),
          dismissedById: session.user.id,
        }),
      },
    });

    return NextResponse.json({ insight: updatedInsight });
  } catch (error) {
    console.error("Error updating insight:", error);
    return NextResponse.json(
      {
        error: "Failed to update insight",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

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

    // Generate insights
    const insights = await generateWorkspaceInsights(workspace.id);

    // Store insights
    await storeInsights(workspace.id, insights);

    return NextResponse.json({
      success: true,
      insightsGenerated: insights.length,
      insights,
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      {
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
