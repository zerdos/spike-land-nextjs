import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

async function getJobHandler(jobId: string, userId: string) {
  const job = await prisma.imageEnhancementJob.findUnique({
    where: { id: jobId },
    include: {
      image: true,
    },
  });

  if (!job || job.userId !== userId) {
    return { notFound: true as const };
  }

  return {
    notFound: false as const,
    job: {
      id: job.id,
      status: job.status,
      tier: job.tier,
      tokensCost: job.tokensCost,
      enhancedUrl: job.enhancedUrl,
      enhancedWidth: job.enhancedWidth,
      enhancedHeight: job.enhancedHeight,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      processingStartedAt: job.processingStartedAt,
      processingCompletedAt: job.processingCompletedAt,
      image: {
        id: job.image.id,
        name: job.image.name,
        originalUrl: job.image.originalUrl,
        originalWidth: job.image.originalWidth,
        originalHeight: job.image.originalHeight,
      },
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const { data, error } = await tryCatch(getJobHandler(jobId, session.user.id));

  if (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch job" },
      { status: 500 },
    );
  }

  if (data.notFound) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(data.job);
}

type DeleteJobResult =
  | { status: "notFound"; }
  | { status: "invalidStatus"; jobStatus: JobStatus; }
  | { status: "success"; };

async function deleteJobHandler(
  jobId: string,
  userId: string,
): Promise<DeleteJobResult> {
  const job = await prisma.imageEnhancementJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.userId !== userId) {
    return { status: "notFound" };
  }

  if (
    job.status !== JobStatus.COMPLETED &&
    job.status !== JobStatus.FAILED &&
    job.status !== JobStatus.CANCELLED &&
    job.status !== JobStatus.REFUNDED
  ) {
    return { status: "invalidStatus", jobStatus: job.status };
  }

  await prisma.imageEnhancementJob.delete({
    where: { id: jobId },
  });

  return { status: "success" };
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const { data, error } = await tryCatch(
    deleteJobHandler(jobId, session.user.id),
  );

  if (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete job",
      },
      { status: 500 },
    );
  }

  if (data.status === "notFound") {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (data.status === "invalidStatus") {
    return NextResponse.json(
      {
        error:
          `Cannot delete job with status: ${data.jobStatus}. Only COMPLETED, FAILED, CANCELLED, or REFUNDED jobs can be deleted.`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Job deleted successfully",
  });
}
