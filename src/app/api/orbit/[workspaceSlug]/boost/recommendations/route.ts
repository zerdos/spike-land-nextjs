/**
 * GET /api/orbit/[workspaceSlug]/boost/recommendations
 * List all boost recommendations for workspace
 *
 * DELETE /api/orbit/[workspaceSlug]/boost/recommendations
 * Bulk expire recommendations
 *
 * Issue #565 - Content-to-Ads Loop
 */

import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Valid status values for recommendations
type RecommendationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
) {
  try {
    const { workspaceSlug } = await params;

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause - use type assertion for status since Prisma types
    // may not be regenerated yet after schema migration
    const where = {
      workspaceId: workspace.id,
      ...(status && { status: status as RecommendationStatus }),
    };

    // Fetch recommendations
    const recommendations = await prisma.postBoostRecommendation.findMany({
      where,
      include: {
        postPerformance: true,
        appliedBoost: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.postBoostRecommendation.count({ where });

    return NextResponse.json({
      recommendations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
) {
  try {
    const { workspaceSlug } = await params;

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Expire all pending recommendations that are past their expiration date
    const result = await prisma.postBoostRecommendation.updateMany({
      where: {
        workspaceId: workspace.id,
        status: "PENDING",
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return NextResponse.json({
      success: true,
      expired: result.count,
    });
  } catch (error) {
    console.error("Error expiring recommendations:", error);
    return NextResponse.json(
      { error: "Failed to expire recommendations" },
      { status: 500 },
    );
  }
}
