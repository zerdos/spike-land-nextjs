/**
 * Hypothesis Experiments API - Get/Update/Delete
 * Epic #516
 *
 * GET /api/hypothesis/experiments/[id] - Get experiment
 * PATCH /api/hypothesis/experiments/[id] - Update experiment
 * DELETE /api/hypothesis/experiments/[id] - Delete experiment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
 
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";
import type { UpdateExperimentRequest } from "@/types/hypothesis-agent";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    const experiment = await agent.getExperiment(params.id);

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error("Error getting experiment:", error);
    return NextResponse.json(
      { error: "Failed to get experiment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, ...updateData } = body as UpdateExperimentRequest & {
      workspaceId: string;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    const experiment = await agent.updateExperiment(params.id, updateData);

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error("Error updating experiment:", error);
    return NextResponse.json(
      { error: "Failed to update experiment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    await agent.deleteExperiment(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting experiment:", error);
    return NextResponse.json(
      { error: "Failed to delete experiment" },
      { status: 500 }
    );
  }
}
