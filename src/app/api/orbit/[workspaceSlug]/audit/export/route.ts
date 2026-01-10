/**
 * Audit Log Export API
 *
 * GET /api/orbit/[workspaceSlug]/audit/export - Export audit logs
 *
 * Query Parameters:
 * - format: csv, json, or pdf (required)
 * - userId: Filter by user ID
 * - actions: Comma-separated list of action types
 * - targetId: Filter by target ID
 * - targetType: Filter by target type
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - includeMetadata: true/false (default: true for json, false for csv/pdf)
 *
 * Resolves #590: Build comprehensive Audit Log
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { AuditExportService } from "@/lib/audit";
import type { AuditLogExportOptions, AuditLogSearchParams, ExportFormat } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { AuditAction } from "@prisma/client";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/audit/export - Export audit logs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is admin/owner for export
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

  // Parse export parameters
  const queryParams = request.nextUrl.searchParams;

  const format = queryParams.get("format") as ExportFormat;
  if (!format || !["csv", "json", "pdf"].includes(format)) {
    return NextResponse.json(
      { error: "format is required and must be csv, json, or pdf" },
      { status: 400 },
    );
  }

  // Build search params
  const searchParams: AuditLogSearchParams = {
    workspaceId: workspace.id,
  };

  const userId = queryParams.get("userId");
  if (userId) {
    searchParams.userId = userId;
  }

  const actions = queryParams.get("actions");
  if (actions) {
    searchParams.actions = actions.split(",") as AuditAction[];
  }

  const targetId = queryParams.get("targetId");
  if (targetId) {
    searchParams.targetId = targetId;
  }

  const targetType = queryParams.get("targetType");
  if (targetType) {
    searchParams.targetType = targetType;
  }

  const startDate = queryParams.get("startDate");
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      searchParams.startDate = date;
    }
  }

  const endDate = queryParams.get("endDate");
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      searchParams.endDate = date;
    }
  }

  // Determine metadata inclusion
  let includeMetadata = format === "json";
  const includeMetadataParam = queryParams.get("includeMetadata");
  if (includeMetadataParam !== null) {
    includeMetadata = includeMetadataParam === "true";
  }

  const exportOptions: AuditLogExportOptions = {
    format,
    searchParams,
    includeMetadata,
  };

  // Validate options
  const validationErrors = AuditExportService.validateOptions(exportOptions);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Invalid export options", details: validationErrors },
      { status: 400 },
    );
  }

  // Execute export
  const { data: exportResult, error: exportError } = await tryCatch(
    AuditExportService.export(exportOptions),
  );

  if (exportError) {
    console.error("Failed to export audit logs:", exportError);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 },
    );
  }

  // Return appropriate response based on format
  const headers: Record<string, string> = {
    "Content-Type": exportResult.mimeType,
    "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
    "X-Record-Count": String(exportResult.recordCount),
  };

  // Convert Buffer to Uint8Array for Response compatibility
  const responseData = Buffer.isBuffer(exportResult.data)
    ? new Uint8Array(exportResult.data)
    : exportResult.data;

  return new NextResponse(responseData, {
    status: 200,
    headers,
  });
}
