/**
 * Boost Impact API
 *
 * GET /api/orbit/analytics/boost-impact/[boostId] - Get impact analysis
 * POST /api/orbit/analytics/boost-impact/[boostId] - Trigger analysis
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  analyzeBoostImpact,
  getBoostImpact,
} from "@/lib/orbit/analytics/boost-impact-analyzer";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ boostId: string; }>; },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boostId } = await params;

    const impact = await getBoostImpact(boostId);

    if (!impact) {
      return NextResponse.json(
        { error: "Impact analysis not found" },
        { status: 404 },
      );
    }

    // Verify workspace access
    const workspace = await db.workspace.findUnique({
      where: { id: impact.boostedPost.workspaceId },
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

    return NextResponse.json({ impact });
  } catch (error) {
    console.error("Error fetching impact analysis:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch impact analysis",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ boostId: string; }>; },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boostId } = await params;

    // Get boost
    const boost = await db.boostedPost.findUnique({
      where: { id: boostId },
      include: {
        originalPost: {
          include: {
            performance: true,
          },
        },
      },
    });

    if (!boost) {
      return NextResponse.json({ error: "Boost not found" }, { status: 404 });
    }

    // Verify workspace access
    const workspace = await db.workspace.findUnique({
      where: { id: boost.workspaceId },
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

    // Verify boost has completed or is active
    if (boost.status !== "COMPLETED" && boost.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Boost must be active or completed to analyze impact" },
        { status: 400 },
      );
    }

    // Get organic baseline from performance data
    const organicPerformance = boost.originalPost.performance;

    if (!organicPerformance) {
      return NextResponse.json(
        { error: "Organic performance data not found" },
        { status: 404 },
      );
    }

    // Run impact analysis
    const result = await analyzeBoostImpact({
      boostedPostId: boostId,
      organicBaseline: {
        impressions: organicPerformance.impressions,
        engagementRate: Number(organicPerformance.engagementRate),
        reach: organicPerformance.reach,
        clicks: organicPerformance.clicks,
      },
      boostPeriodStart: boost.startedAt || boost.createdAt,
      boostPeriodEnd: boost.endedAt || new Date(),
    });

    // Get updated impact data
    const impact = await getBoostImpact(boostId);

    return NextResponse.json({
      success: true,
      result,
      impact,
    });
  } catch (error) {
    console.error("Error analyzing boost impact:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze boost impact",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
