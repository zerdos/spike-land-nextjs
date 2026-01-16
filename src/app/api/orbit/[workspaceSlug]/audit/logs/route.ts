/**
 * Workspace Audit Logs API
 *
 * GET /api/orbit/[workspaceSlug]/audit/logs - Search audit logs
 * POST /api/orbit/[workspaceSlug]/audit/logs - Create audit log entry (internal use)
 *
 * Query Parameters for GET:
 * - userId: Filter by user ID
 * - actions: Comma-separated list of action types
 * - targetId: Filter by target ID
 * - targetType: Filter by target type
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: Number of results (default 50, max 1000)
 * - offset: Pagination offset
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: asc or desc (default: desc)
 *
 * Resolves #590: Build comprehensive Audit Log
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { WorkspaceAuditLogger } from "@/lib/audit";
import type { AuditLogSearchParams, CreateWorkspaceAuditLogOptions } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { AuditAction } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/audit/logs - Search audit logs
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

  // Parse search parameters
  const searchParams = request.nextUrl.searchParams;

  const params_: AuditLogSearchParams = {
    workspaceId: workspace.id,
  };

  const userId = searchParams.get("userId");
  if (userId) {
    params_.userId = userId;
  }

  const actions = searchParams.get("actions");
  if (actions) {
    params_.actions = actions.split(",") as AuditAction[];
  }

  const targetId = searchParams.get("targetId");
  if (targetId) {
    params_.targetId = targetId;
  }

  const targetType = searchParams.get("targetType");
  if (targetType) {
    params_.targetType = targetType;
  }

  const resourceId = searchParams.get("resourceId");
  if (resourceId) {
    params_.resourceId = resourceId;
  }

  const resourceType = searchParams.get("resourceType");
  if (resourceType) {
    params_.resourceType = resourceType;
  }

  const startDate = searchParams.get("startDate");
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      params_.startDate = date;
    }
  }

  const endDate = searchParams.get("endDate");
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      params_.endDate = date;
    }
  }

  const limit = searchParams.get("limit");
  if (limit) {
    params_.limit = Math.min(parseInt(limit, 10) || 50, 1000);
  }

  const offset = searchParams.get("offset");
  if (offset) {
    params_.offset = parseInt(offset, 10) || 0;
  }

  const sortBy = searchParams.get("sortBy") as AuditLogSearchParams["sortBy"];
  if (sortBy && ["createdAt", "action", "userId"].includes(sortBy)) {
    params_.sortBy = sortBy;
  }

  const sortOrder = searchParams.get(
    "sortOrder",
  ) as AuditLogSearchParams["sortOrder"];
  if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
    params_.sortOrder = sortOrder;
  }

  // Search audit logs
  const { data: result, error: searchError } = await tryCatch(
    WorkspaceAuditLogger.search(params_),
  );

  if (searchError) {
    console.error("Failed to search audit logs:", searchError);
    return NextResponse.json(
      { error: "Failed to search audit logs" },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}

/**
 * POST /api/orbit/[workspaceSlug]/audit/logs - Create audit log entry
 * Note: This is primarily for internal use and automated logging
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
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const {
    action,
    targetId,
    targetType,
    resourceId,
    resourceType,
    oldValue,
    newValue,
    metadata,
  } = body as Partial<CreateWorkspaceAuditLogOptions>;

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  // Get request metadata
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  // Create audit log
  const logId = await WorkspaceAuditLogger.log({
    workspaceId: workspace.id,
    userId: session.user.id,
    action: action as AuditAction,
    targetId,
    targetType,
    resourceId,
    resourceType,
    oldValue,
    newValue,
    metadata,
    ipAddress,
    userAgent,
  });

  if (!logId) {
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: logId, success: true }, { status: 201 });
}
