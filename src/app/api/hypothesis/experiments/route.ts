/**
 * Hypothesis Experiments API - List/Create
 * Epic #516
 *
 * GET /api/hypothesis/experiments - List experiments
 * POST /api/hypothesis/experiments - Create experiment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";
import type { CreateExperimentRequest } from "@/types/hypothesis-agent";

export async function GET(request: NextRequest) {
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

    const status = searchParams.get("status") as any;
    const contentType = searchParams.get("contentType") || undefined;
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);

    const experiments = await agent.listExperiments({
      ...(status && { status }),
      ...(contentType && { contentType }),
      ...(tags && { tags }),
    });

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error("Error listing experiments:", error);
    return NextResponse.json(
      { error: "Failed to list experiments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, ...experimentData } = body as CreateExperimentRequest & {
      workspaceId: string;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    const experiment = await agent.createExperiment(experimentData);

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    console.error("Error creating experiment:", error);
    return NextResponse.json(
      { error: "Failed to create experiment", details: String(error) },
      { status: 500 }
    );
  }
}
