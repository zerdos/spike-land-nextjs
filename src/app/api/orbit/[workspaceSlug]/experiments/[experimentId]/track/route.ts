/**
 * Event Tracking API - Epic #516
 *
 * Track events (impressions, conversions, custom) for experiments.
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { getExperiment } from "@/lib/hypothesis-agent/core/experiment-manager";
import { trackEvent } from "@/lib/hypothesis-agent/core/event-tracker";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; experimentId: string }>;
}

// Validation schema
const trackEventSchema = z.object({
  variantId: z.string().cuid(),
  eventType: z.enum(["impression", "click", "conversion", "custom"]),
  eventName: z.string().optional(),
  value: z.number().optional(),
  visitorId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/orbit/[workspaceSlug]/experiments/[experimentId]/track
 * Track an event for an experiment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, experimentId } = await params;

  // Allow both authenticated and anonymous tracking
  const session = await auth();

  // Verify workspace exists (but don't require membership for tracking)
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
      },
      select: { id: true },
    })
  );

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Fetch experiment
  const { data: experiment, error: experimentError } = await tryCatch(
    getExperiment(experimentId)
  );

  if (experimentError || !experiment || experiment.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  // Verify experiment is running
  if (experiment.status !== "RUNNING") {
    return NextResponse.json(
      { error: "Can only track events for RUNNING experiments" },
      { status: 400 }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request
  const validation = trackEventSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.errors },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Verify variant exists
  const variant = experiment.variants.find((v) => v.id === data.variantId);
  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  // Use authenticated user ID if available, otherwise use provided visitorId
  const effectiveUserId = session?.user?.id || data.userId;
  const effectiveVisitorId = data.visitorId || `anonymous-${Date.now()}`;

  // Track event
  const { error: trackError } = await tryCatch(
    trackEvent(experimentId, data.variantId, {
      eventType: data.eventType,
      eventName: data.eventName,
      value: data.value,
      visitorId: effectiveVisitorId,
      userId: effectiveUserId,
      metadata: data.metadata,
    })
  );

  if (trackError) {
    return NextResponse.json(
      { error: "Failed to track event", details: trackError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
