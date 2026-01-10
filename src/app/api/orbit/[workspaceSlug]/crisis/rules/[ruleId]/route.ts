/**
 * Crisis Alert Rule Detail API
 *
 * GET /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Get rule details
 * PUT /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Update rule
 * DELETE /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Delete rule
 *
 * Resolves #588: Create Crisis Detection System
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { CrisisDetector } from "@/lib/crisis";
import type { UpdateAlertRuleOptions } from "@/lib/crisis";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CrisisRuleType, CrisisSeverity } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; ruleId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Get rule details
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, ruleId } = await params;

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

  // Get rule
  const { data: rule, error } = await tryCatch(
    prisma.crisisAlertRule.findUnique({
      where: { id: ruleId },
    }),
  );

  if (error || !rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Verify rule belongs to this workspace
  if (rule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(rule);
}

/**
 * PUT /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Update rule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, ruleId } = await params;

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

  // Verify rule exists and belongs to this workspace
  const { data: existingRule, error: ruleError } = await tryCatch(
    prisma.crisisAlertRule.findUnique({
      where: { id: ruleId },
    }),
  );

  if (ruleError || !existingRule || existingRule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
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
    isActive,
  } = body as Partial<UpdateAlertRuleOptions>;

  // Validate rule type if provided
  if (ruleType) {
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
  }

  // Validate severity if provided
  if (severity) {
    const validSeverities: CrisisSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${validSeverities.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Update rule
  const updatedRule = await CrisisDetector.updateRule(ruleId, {
    name,
    description,
    ruleType,
    conditions,
    severity,
    notifyChannels,
    escalateAfterMinutes,
    isActive,
  });

  if (!updatedRule) {
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 },
    );
  }

  return NextResponse.json(updatedRule);
}

/**
 * DELETE /api/orbit/[workspaceSlug]/crisis/rules/[ruleId] - Delete rule
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, ruleId } = await params;

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

  // Verify rule exists and belongs to this workspace
  const { data: existingRule, error: ruleError } = await tryCatch(
    prisma.crisisAlertRule.findUnique({
      where: { id: ruleId },
    }),
  );

  if (ruleError || !existingRule || existingRule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Delete rule
  const deleted = await CrisisDetector.deleteRule(ruleId);

  if (!deleted) {
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
