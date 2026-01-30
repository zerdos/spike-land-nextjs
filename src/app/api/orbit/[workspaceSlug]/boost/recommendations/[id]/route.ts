/**
 * GET /api/orbit/[workspaceSlug]/boost/recommendations/[id]
 * Get single recommendation details
 *
 * PATCH /api/orbit/[workspaceSlug]/boost/recommendations/[id]
 * Accept or reject recommendation
 *
 * Issue #565 - Content-to-Ads Loop
 */

import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; id: string; }>; },
) {
  try {
    const { workspaceSlug, id } = await params;

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

    // Fetch recommendation
    const recommendation = await prisma.postBoostRecommendation.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
      include: {
        postPerformance: true,
        appliedBoost: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendation" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; id: string; }>; },
) {
  try {
    const { workspaceSlug, id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 },
      );
    }

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

    // Fetch recommendation
    const recommendation = await prisma.postBoostRecommendation.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 },
      );
    }

    // Update recommendation
    const updated = await prisma.postBoostRecommendation.update({
      where: { id },
      data: {
        status: action === "accept" ? "ACCEPTED" : "REJECTED",
        ...(action === "accept" && { acceptedAt: new Date() }),
        ...(action === "reject" && { rejectedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      recommendation: updated,
    });
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 },
    );
  }
}
