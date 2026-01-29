/**
 * Hypothesis Experiments API - Events
 * Epic #516
 *
 * POST /api/hypothesis/experiments/[id]/events - Track event
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
 
import { createHypothesisAgent } from "@/lib/hypothesis-agent/hypothesis-agent";
import type { TrackEventRequest } from "@/types/hypothesis-agent";

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
    const { workspaceId, variantId, ...eventData } = body as TrackEventRequest & {
      workspaceId: string;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    if (!variantId) {
      return NextResponse.json({ error: "variantId is required" }, { status: 400 });
    }

    const agent = createHypothesisAgent(workspaceId);
    const event = await agent.trackEvent(params.id, variantId, eventData);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}
