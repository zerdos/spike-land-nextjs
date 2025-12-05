import { auth } from "@/auth";
import prisma from "@/lib/prisma";
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
