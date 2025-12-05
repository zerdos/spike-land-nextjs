import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
      include: {
        image: true,
      },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch job" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; }>; },
) {
  try {
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
      job.status !== JobStatus.COMPLETED &&
      job.status !== JobStatus.FAILED &&
      job.status !== JobStatus.CANCELLED &&
      job.status !== JobStatus.REFUNDED
    ) {
      return NextResponse.json(
        {
          error:
            `Cannot delete job with status: ${job.status}. Only COMPLETED, FAILED, CANCELLED, or REFUNDED jobs can be deleted.`,
        },
        { status: 400 },
      );
    }

    await prisma.imageEnhancementJob.delete({
      where: { id: jobId },
    });

    return NextResponse.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete job" },
      { status: 500 },
    );
  }
}
