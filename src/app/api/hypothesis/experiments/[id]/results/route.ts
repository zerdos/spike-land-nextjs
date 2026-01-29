/**
 * Hypothesis Experiments API - Results
 * Epic #516
 *
 * GET /api/hypothesis/experiments/[id]/results - Get experiment analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
 
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";

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

    const analysis = await agent.analyzeExperiment(params.id);

    return NextResponse.json({
      experiment,
      analysis,
    });
  } catch (error) {
    console.error("Error getting experiment results:", error);
    return NextResponse.json(
      { error: "Failed to get experiment results" },
      { status: 500 }
    );
  }
}
