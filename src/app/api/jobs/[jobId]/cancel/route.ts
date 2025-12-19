import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { Run } from "workflow/api";

async function cancelJob(
  params: Promise<{ jobId: string; }>,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.imageEnhancementJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (
    job.status !== JobStatus.PENDING && job.status !== JobStatus.PROCESSING
  ) {
    return NextResponse.json(
      { error: `Cannot cancel job with status: ${job.status}` },
      { status: 400 },
    );
  }

  // Cancel the workflow run if one exists
  if (job.workflowRunId) {
    const workflowRun = new Run(job.workflowRunId);
    const { error: workflowError } = await tryCatch(workflowRun.cancel());
    if (workflowError) {
      // Log but don't fail - the workflow may have already completed
      console.warn("Failed to cancel workflow run:", workflowError);
    }
  }

  const updatedJob = await prisma.imageEnhancementJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.CANCELLED,
    },
  });

  const refundResult = await TokenBalanceManager.refundTokens(
    session.user.id,
    job.tokensCost,
    jobId,
    "Job cancelled by user",
  );

  if (!refundResult.success) {
    console.error("Failed to refund tokens:", refundResult.error);
    return NextResponse.json(
      {
        error: "Job cancelled but token refund failed. Please contact support.",
        job: updatedJob,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    job: updatedJob,
    tokensRefunded: job.tokensCost,
    newBalance: refundResult.balance,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  const { data, error } = await tryCatch(cancelJob(params));

  if (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel job",
      },
      { status: 500 },
    );
  }

  return data;
}
