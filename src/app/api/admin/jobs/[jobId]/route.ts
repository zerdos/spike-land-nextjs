/**
 * Admin Single Job API
 *
 * GET /api/admin/jobs/[jobId] - Fetch single job details
 * DELETE /api/admin/jobs/[jobId] - Cancel/kill a job
 *
 * Supports both EnhancementJob and McpGenerationJob
 */

// Force dynamic rendering - skip static page data collection (imports sharp via mcp service)
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import { cancelMcpJob } from "@/lib/mcp/generation-service";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import type { JobSource, UnifiedJob } from "@/types/admin-jobs";
import { JobStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ jobId: string; }>;
}

/**
 * Transform enhancement job to unified format
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
  image: {
    name: string;
    originalUrl: string;
    originalWidth: number | null;
    originalHeight: number | null;
    originalFormat: string | null;
    originalSizeBytes: number | null;
  };
  user: { email: string | null; name: string | null; };
  // New fields
  analysisResult: unknown;
  analysisSource: string | null;
  wasCropped: boolean;
  cropDimensions: unknown;
  currentStage: string | null;
  pipelineId: string | null;
  isBlend: boolean;
  sourceImageId: string | null;
  sourceImage: { originalUrl: string; } | null;
  isAnonymous: boolean;
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
    // New fields
    analysisResult: job.analysisResult as UnifiedJob["analysisResult"],
    analysisSource: job.analysisSource,
    wasCropped: job.wasCropped,
    cropDimensions: job.cropDimensions as UnifiedJob["cropDimensions"],
    currentStage: job.currentStage,
    pipelineId: job.pipelineId,
    isBlend: job.isBlend,
    sourceImageId: job.sourceImageId,
    sourceImageUrl: job.sourceImage?.originalUrl ?? null,
    originalWidth: job.image.originalWidth,
    originalHeight: job.image.originalHeight,
    originalFormat: job.image.originalFormat,
    originalSizeBytes: job.image.originalSizeBytes,
    isAnonymous: job.isAnonymous,
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

/**
 * GET /api/admin/jobs/[jobId]
 * Fetch single job by ID (from either table)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  // Auth check
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await tryCatch(isAdminByUserId(session.user.id));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try to find in enhancement jobs first
  const { data: enhancementJob } = await tryCatch(
    prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
      include: {
        image: {
          select: {
            name: true,
            originalUrl: true,
            originalWidth: true,
            originalHeight: true,
            originalFormat: true,
            originalSizeBytes: true,
          },
        },
        user: { select: { email: true, name: true } },
        sourceImage: { select: { originalUrl: true } },
      },
    }),
  );

  if (enhancementJob) {
    return NextResponse.json({
      job: transformEnhancementJob(enhancementJob),
    });
  }

  // Try MCP jobs
  const { data: mcpJob } = await tryCatch(
    prisma.mcpGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        user: { select: { email: true, name: true } },
        apiKey: { select: { name: true } },
      },
    }),
  );

  if (mcpJob) {
    return NextResponse.json({
      job: transformMcpJob(mcpJob),
    });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}

/**
 * DELETE /api/admin/jobs/[jobId]
 * Cancel/kill a job (PENDING/PROCESSING only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  // Auth check
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await tryCatch(isAdminByUserId(session.user.id));
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try enhancement job first
  const { data: enhancementJob } = await tryCatch(
    prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, userId: true, tokensCost: true },
    }),
  );

  if (enhancementJob) {
    if (
      enhancementJob.status !== JobStatus.PENDING &&
      enhancementJob.status !== JobStatus.PROCESSING
    ) {
      return NextResponse.json(
        {
          error:
            `Cannot cancel job with status ${enhancementJob.status}. Only PENDING or PROCESSING jobs can be cancelled.`,
        },
        { status: 400 },
      );
    }

    // Cancel the job
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        errorMessage: "Cancelled by admin",
        processingCompletedAt: new Date(),
      },
    });

    // Refund tokens
    await TokenBalanceManager.refundTokens(
      enhancementJob.userId,
      enhancementJob.tokensCost,
      jobId,
      "Admin cancelled job",
    );

    return NextResponse.json({
      success: true,
      tokensRefunded: enhancementJob.tokensCost,
      source: "enhancement",
    });
  }

  // Try MCP job
  const { data: mcpJob } = await tryCatch(
    prisma.mcpGenerationJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    }),
  );

  if (mcpJob) {
    const result = await cancelMcpJob(jobId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      tokensRefunded: result.tokensRefunded,
      source: "mcp",
    });
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}
