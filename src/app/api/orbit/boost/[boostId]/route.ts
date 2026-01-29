/**
 * Boost Detail API
 *
 * GET /api/orbit/boost/[boostId] - Get boost details
 * PATCH /api/orbit/boost/[boostId] - Update draft boost
 * DELETE /api/orbit/boost/[boostId] - Cancel boost
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  getBoost,
  updateBoost,
  cancelBoost,
} from "@/lib/orbit/boost/boost-service";
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

    const boost = await getBoost(boostId);

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
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    return NextResponse.json({ boost });
  } catch (error) {
    console.error("Error fetching boost:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch boost",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ boostId: string; }>; },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boostId } = await params;
    const body = await req.json();

    // Get boost and verify access
    const existingBoost = await getBoost(boostId);

    if (!existingBoost) {
      return NextResponse.json({ error: "Boost not found" }, { status: 404 });
    }

    const workspace = await db.workspace.findUnique({
      where: { id: existingBoost.workspaceId },
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
        { error: "Access denied" },
        { status: 403 },
      );
    }

    // Update boost
    const updatedBoost = await updateBoost(boostId, {
      ...(body.budget && { budget: Number(body.budget) }),
      ...(body.duration && { duration: Number(body.duration) }),
      ...(body.targetingData && { targetingData: body.targetingData }),
      ...(body.audienceSuggestions && {
        audienceSuggestions: body.audienceSuggestions,
      }),
    });

    return NextResponse.json({ boost: updatedBoost });
  } catch (error) {
    console.error("Error updating boost:", error);
    return NextResponse.json(
      {
        error: "Failed to update boost",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ boostId: string; }>; },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boostId } = await params;

    // Get boost and verify access
    const boost = await getBoost(boostId);

    if (!boost) {
      return NextResponse.json({ error: "Boost not found" }, { status: 404 });
    }

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
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    // Cancel boost
    await cancelBoost(boostId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling boost:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel boost",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
