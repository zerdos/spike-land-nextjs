/**
 * Audit Retention Policy API
 *
 * GET /api/orbit/[workspaceSlug]/audit/retention - List retention policies
 * POST /api/orbit/[workspaceSlug]/audit/retention - Create retention policy
 * PUT /api/orbit/[workspaceSlug]/audit/retention - Update retention policy
 * DELETE /api/orbit/[workspaceSlug]/audit/retention - Delete retention policy
 *
 * Resolves #590: Build comprehensive Audit Log
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { AuditRetentionManager } from "@/lib/audit";
import type { RetentionPolicyConfig } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/audit/retention - List retention policies
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

  // Get policies for this workspace
  const { data: policies, error: policiesError } = await tryCatch(
    AuditRetentionManager.listPolicies(workspace.id),
  );

  if (policiesError) {
    console.error("Failed to list retention policies:", policiesError);
    return NextResponse.json(
      { error: "Failed to list retention policies" },
      { status: 500 },
    );
  }

  // Get retention stats
  const { data: stats, error: statsError } = await tryCatch(
    AuditRetentionManager.getRetentionStats(workspace.id),
  );

  return NextResponse.json({
    policies,
    stats: statsError ? null : stats,
  });
}

/**
 * POST /api/orbit/[workspaceSlug]/audit/retention - Create retention policy
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

  const config = body as RetentionPolicyConfig;

  // Validate required fields
  if (!config.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (config.retentionDays === undefined || config.retentionDays < 1) {
    return NextResponse.json(
      { error: "retentionDays must be a positive number" },
      { status: 400 },
    );
  }

  // Create policy
  const { data: policy, error: createError } = await tryCatch(
    AuditRetentionManager.createPolicy(workspace.id, config),
  );

  if (createError || !policy) {
    console.error("Failed to create retention policy:", createError);
    return NextResponse.json(
      { error: "Failed to create retention policy" },
      { status: 500 },
    );
  }

  return NextResponse.json({ policy }, { status: 201 });
}

/**
 * PUT /api/orbit/[workspaceSlug]/audit/retention - Update retention policy
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

  const { policyId, ...updates } = body as { policyId: string; } & Partial<RetentionPolicyConfig>;

  if (!policyId) {
    return NextResponse.json({ error: "policyId is required" }, { status: 400 });
  }

  // Verify the policy belongs to this workspace
  const existingPolicy = await AuditRetentionManager.getPolicy(policyId);
  if (!existingPolicy || existingPolicy.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  // Validate updates
  if (updates.retentionDays !== undefined && updates.retentionDays < 1) {
    return NextResponse.json(
      { error: "retentionDays must be a positive number" },
      { status: 400 },
    );
  }

  // Update policy
  const { data: policy, error: updateError } = await tryCatch(
    AuditRetentionManager.updatePolicy(policyId, updates),
  );

  if (updateError || !policy) {
    console.error("Failed to update retention policy:", updateError);
    return NextResponse.json(
      { error: "Failed to update retention policy" },
      { status: 500 },
    );
  }

  return NextResponse.json({ policy });
}

/**
 * DELETE /api/orbit/[workspaceSlug]/audit/retention - Delete retention policy
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is owner (only owners can delete policies)
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
            role: "OWNER",
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

  // Get policy ID from query params
  const policyId = request.nextUrl.searchParams.get("policyId");
  if (!policyId) {
    return NextResponse.json({ error: "policyId is required" }, { status: 400 });
  }

  // Verify the policy belongs to this workspace
  const existingPolicy = await AuditRetentionManager.getPolicy(policyId);
  if (!existingPolicy || existingPolicy.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  // Delete policy
  const success = await AuditRetentionManager.deletePolicy(policyId);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to delete retention policy" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
