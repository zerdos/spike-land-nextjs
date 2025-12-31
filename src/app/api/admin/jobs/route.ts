/**
 * Admin Jobs API
 *
 * GET endpoint for fetching job listings with filtering, pagination, and search.
 * Admin-only access.
 *
 * Supports both EnhancementJob and McpGenerationJob with unified response format.
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { JobSource, UnifiedJob } from "@/types/admin-jobs";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES: JobStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

const VALID_TYPES: Array<JobSource | "all"> = ["all", "enhancement", "mcp"];

/**
 * Transform enhancement job to unified format (list view - lightweight)
 */
function transformEnhancementJob(job: {
  id: string;
  status: JobStatus;
  tier: string;
  tokensCost: number;
  enhancedUrl: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  enhancedSizeBytes: number | null;
  errorMessage: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  geminiPrompt: string | null;
  geminiModel: string | null;
  geminiTemp: number | null;
  workflowRunId: string | null;
  imageId: string;
  currentStage: string | null;
  image: { name: string; originalUrl: string; };
  user: { email: string | null; name: string | null; };
}): UnifiedJob {
  return {
    id: job.id,
    source: "enhancement" as JobSource,
    status: job.status,
    tier: job.tier as UnifiedJob["tier"],
    tokensCost: job.tokensCost,
    prompt: job.geminiPrompt,
    inputUrl: job.image.originalUrl,
    outputUrl: job.enhancedUrl,
    outputWidth: job.enhancedWidth,
    outputHeight: job.enhancedHeight,
    outputSizeBytes: job.enhancedSizeBytes,
    errorMessage: job.errorMessage,
    userId: job.userId,
    userEmail: job.user.email ?? "Unknown",
    userName: job.user.name,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    processingStartedAt: job.processingStartedAt?.toISOString() ?? null,
    processingCompletedAt: job.processingCompletedAt?.toISOString() ?? null,
    imageId: job.imageId,
    imageName: job.image.name,
    retryCount: job.retryCount,
    maxRetries: job.maxRetries,
    geminiModel: job.geminiModel,
    geminiTemp: job.geminiTemp,
    workflowRunId: job.workflowRunId,
    currentStage: job.currentStage,
  };
}

/**
 * Transform MCP job to unified format
 */
function transformMcpJob(job: {
  id: string;
  status: JobStatus;
  tier: string;
  tokensCost: number;
  type: string;
  prompt: string;
  inputImageUrl: string | null;
  inputImageR2Key: string | null;
  outputImageUrl: string | null;
  outputImageR2Key: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputSizeBytes: number | null;
  errorMessage: string | null;
  userId: string;
  apiKeyId: string | null;
  geminiModel: string | null;
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  user: { email: string | null; name: string | null; };
  apiKey: { name: string; } | null;
}): UnifiedJob {
  return {
    id: job.id,
    source: "mcp" as JobSource,
    status: job.status,
    tier: job.tier as UnifiedJob["tier"],
    tokensCost: job.tokensCost,
    prompt: job.prompt,
    inputUrl: job.inputImageUrl,
    outputUrl: job.outputImageUrl,
    outputWidth: job.outputWidth,
    outputHeight: job.outputHeight,
    outputSizeBytes: job.outputSizeBytes,
    errorMessage: job.errorMessage,
    userId: job.userId,
    userEmail: job.user.email ?? "Unknown",
    userName: job.user.name,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    processingStartedAt: job.processingStartedAt?.toISOString() ?? null,
    processingCompletedAt: job.processingCompletedAt?.toISOString() ?? null,
    mcpJobType: job.type as "GENERATE" | "MODIFY",
    apiKeyId: job.apiKeyId,
    apiKeyName: job.apiKey?.name ?? null,
    inputR2Key: job.inputImageR2Key,
    outputR2Key: job.outputImageR2Key,
    geminiModel: job.geminiModel,
  };
}

export async function GET(request: NextRequest) {
  // Auth check
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError) {
    console.error("[Admin Jobs API] Error:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin, error: adminCheckError } = await tryCatch(
    isAdminByUserId(session.user.id),
  );
  if (adminCheckError) {
    console.error("[Admin Jobs API] Error:", adminCheckError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") as JobStatus | null;
  const type = (searchParams.get("type") || "all") as JobSource | "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  const search = searchParams.get("search")?.trim() || "";

  // Validate status if provided
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate type
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Build where clause for enhancement jobs
  const enhancementWhere: {
    status?: JobStatus;
    OR?: Array<
      | { id: { contains: string; }; }
      | { user: { email: { contains: string; mode: "insensitive"; }; }; }
    >;
  } = {};

  // Build where clause for MCP jobs
  const mcpWhere: {
    status?: JobStatus;
    OR?: Array<
      | { id: { contains: string; }; }
      | { user: { email: { contains: string; mode: "insensitive"; }; }; }
    >;
  } = {};

  if (status) {
    enhancementWhere.status = status;
    mcpWhere.status = status;
  }

  if (search) {
    const searchClause = [
      { id: { contains: search } },
      { user: { email: { contains: search, mode: "insensitive" as const } } },
    ];
    enhancementWhere.OR = searchClause;
    mcpWhere.OR = searchClause;
  }

  // Fetch jobs based on type
  const includeEnhancement = type === "all" || type === "enhancement";
  const includeMcp = type === "all" || type === "mcp";

  const { data: queryResults, error: queryError } = await tryCatch(
    Promise.all([
      // Enhancement jobs (with currentStage for progress tracking)
      includeEnhancement
        ? prisma.imageEnhancementJob.findMany({
          where: enhancementWhere,
          include: {
            image: { select: { name: true, originalUrl: true } },
            user: { select: { email: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        : Promise.resolve([]),
      // MCP jobs
      includeMcp
        ? prisma.mcpGenerationJob.findMany({
          where: mcpWhere,
          include: {
            user: { select: { email: true, name: true } },
            apiKey: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        : Promise.resolve([]),
      // Status counts for enhancement jobs
      prisma.imageEnhancementJob.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      // Status counts for MCP jobs
      prisma.mcpGenerationJob.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      // Total counts by type
      prisma.imageEnhancementJob.count(),
      prisma.mcpGenerationJob.count(),
    ]),
  );

  if (queryError) {
    console.error("[Admin Jobs API] Error:", queryError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const [
    enhancementJobs,
    mcpJobs,
    enhancementStatusCounts,
    mcpStatusCounts,
    enhancementTotal,
    mcpTotal,
  ] = queryResults;

  // Transform and merge jobs
  const allJobs: UnifiedJob[] = [
    ...enhancementJobs.map(transformEnhancementJob),
    ...mcpJobs.map(transformMcpJob),
  ];

  // Sort by createdAt descending
  allJobs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Apply pagination
  const total = allJobs.length;
  const paginatedJobs = allJobs.slice((page - 1) * limit, page * limit);

  // Merge status counts
  const statusCountsMap: Record<string, number> = {};
  for (const item of enhancementStatusCounts) {
    statusCountsMap[item.status] = (statusCountsMap[item.status] || 0) +
      item._count.status;
  }
  for (const item of mcpStatusCounts) {
    statusCountsMap[item.status] = (statusCountsMap[item.status] || 0) +
      item._count.status;
  }

  // Calculate total count across all statuses
  const totalAll = Object.values(statusCountsMap).reduce(
    (sum, count) => sum + count,
    0,
  );

  return NextResponse.json({
    jobs: paginatedJobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    statusCounts: {
      ALL: totalAll,
      ...statusCountsMap,
    },
    typeCounts: {
      all: enhancementTotal + mcpTotal,
      enhancement: enhancementTotal,
      mcp: mcpTotal,
    },
  });
}
