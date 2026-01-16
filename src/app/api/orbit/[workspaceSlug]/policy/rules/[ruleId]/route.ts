/**
 * Individual Policy Rule API
 *
 * GET /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Get rule details
 * PATCH /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Update a rule
 * DELETE /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Delete a rule
 *
 * Resolves #584: Build Policy Checker
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteRule, getRule, updateRule } from "@/lib/policy-checker";
import type { PolicyRuleInput } from "@/lib/policy-checker";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; ruleId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Get rule details
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
  const { data: rule, error: ruleError } = await tryCatch(getRule(ruleId));

  if (ruleError || !rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Verify rule belongs to this workspace or is a global rule
  if (rule.workspaceId !== null && rule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(rule);
}

/**
 * PATCH /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Update a rule
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  // Get existing rule
  const { data: existingRule, error: existingError } = await tryCatch(
    getRule(ruleId),
  );

  if (existingError || !existingRule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Can only update workspace-specific rules, not global ones
  if (existingRule.workspaceId === null) {
    return NextResponse.json(
      { error: "Cannot modify global rules" },
      { status: 403 },
    );
  }

  // Verify rule belongs to this workspace
  if (existingRule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateInput: Partial<PolicyRuleInput> = {};
  if (body.name !== undefined) updateInput.name = body.name;
  if (body.description !== undefined) {
    updateInput.description = body.description;
  }
  if (body.platform !== undefined) updateInput.platform = body.platform;
  if (body.category !== undefined) updateInput.category = body.category;
  if (body.ruleType !== undefined) updateInput.ruleType = body.ruleType;
  if (body.conditions !== undefined) updateInput.conditions = body.conditions;
  if (body.severity !== undefined) updateInput.severity = body.severity;
  if (body.isBlocking !== undefined) updateInput.isBlocking = body.isBlocking;
  if (body.isActive !== undefined) updateInput.isActive = body.isActive;
  if (body.sourceUrl !== undefined) updateInput.sourceUrl = body.sourceUrl;

  // Update rule
  const { data: rule, error: updateError } = await tryCatch(
    updateRule(ruleId, updateInput),
  );

  if (updateError) {
    console.error("Error updating rule:", updateError);
    return NextResponse.json({ error: "Failed to update rule" }, {
      status: 500,
    });
  }

  return NextResponse.json(rule);
}

/**
 * DELETE /api/orbit/[workspaceSlug]/policy/rules/[ruleId] - Delete a rule
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

  // Get existing rule
  const { data: existingRule, error: existingError } = await tryCatch(
    getRule(ruleId),
  );

  if (existingError || !existingRule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Can only delete workspace-specific rules, not global ones
  if (existingRule.workspaceId === null) {
    return NextResponse.json(
      { error: "Cannot delete global rules" },
      { status: 403 },
    );
  }

  // Verify rule belongs to this workspace
  if (existingRule.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  // Delete rule
  const { error: deleteError } = await tryCatch(deleteRule(ruleId));

  if (deleteError) {
    console.error("Error deleting rule:", deleteError);
    return NextResponse.json({ error: "Failed to delete rule" }, {
      status: 500,
    });
  }

  return NextResponse.json({ success: true });
}
