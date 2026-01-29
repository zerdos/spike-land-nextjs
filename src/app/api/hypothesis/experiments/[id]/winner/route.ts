/**
 * Hypothesis Experiments API - Winner Selection
 * Epic #516
 *
 * POST /api/hypothesis/experiments/[id]/winner - Select winner and complete
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
 
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";
import type { SelectWinnerRequest } from "@/types/hypothesis-agent";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, variantId, reason } = body as SelectWinnerRequest & {
      workspaceId: string;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    const experiment = await agent.selectWinnerAndComplete(params.id, variantId, reason);

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error("Error selecting winner:", error);
    return NextResponse.json(
      { error: "Failed to select winner", details: String(error) },
      { status: 500 }
    );
  }
}
