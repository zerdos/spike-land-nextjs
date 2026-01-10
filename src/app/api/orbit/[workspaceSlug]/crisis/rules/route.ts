/**
 * Crisis Alert Rules API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/rules - List alert rules
 * POST /api/orbit/[workspaceSlug]/crisis/rules - Create alert rule
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisDetector } from "@/lib/crisis";
import type { CreateAlertRuleOptions } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CrisisRuleType, CrisisSeverity } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/rules - List alert rules
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get filter parameters
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("activeOnly") === "true";

  // Get rules
  const rules = await CrisisDetector.getRules(workspace.id, activeOnly);

  return NextResponse.json({ rules });
}

/**
 * POST /api/orbit/[workspaceSlug]/crisis/rules - Create alert rule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or insufficient permissions" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    name,
    description,
    ruleType,
    conditions,
    severity,
    notifyChannels,
    escalateAfterMinutes,
  } = body as Partial<CreateAlertRuleOptions>;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!ruleType) {
    return NextResponse.json({ error: "ruleType is required" }, { status: 400 });
  }

  const validRuleTypes: CrisisRuleType[] = [
    "SENTIMENT_THRESHOLD",
    "ENGAGEMENT_DROP",
    "MENTION_SPIKE",
    "FOLLOWER_DROP",
    "MANUAL",
  ];

  if (!validRuleTypes.includes(ruleType)) {
    return NextResponse.json(
      { error: `ruleType must be one of: ${validRuleTypes.join(", ")}` },
      { status: 400 },
    );
  }

  if (!conditions) {
    return NextResponse.json({ error: "conditions is required" }, { status: 400 });
  }

  if (!severity) {
    return NextResponse.json({ error: "severity is required" }, { status: 400 });
  }

  const validSeverities: CrisisSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json(
      { error: `severity must be one of: ${validSeverities.join(", ")}` },
      { status: 400 },
    );
  }

  // Create rule
  const rule = await CrisisDetector.createRule({
    workspaceId: workspace.id,
    name,
    description,
    ruleType,
    conditions,
    severity,
    notifyChannels: notifyChannels || ["email", "in_app"],
    escalateAfterMinutes,
  });

  if (!rule) {
    return NextResponse.json(
      { error: "Failed to create alert rule" },
      { status: 500 },
    );
  }

  return NextResponse.json(rule, { status: 201 });
}
