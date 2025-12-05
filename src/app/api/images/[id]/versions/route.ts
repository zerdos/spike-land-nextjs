import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type EnhancementJob = {
  id: string;
  tier: EnhancementTier;
  status: JobStatus;
  tokensCost: number;
  enhancedUrl: string | null;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  enhancedSizeBytes: number | null;
  createdAt: Date;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = checkRateLimit(
      `versions-${session.user.id}`,
      rateLimitConfigs.general,
    );

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitConfigs.general.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
          },
        },
      );
    }

    const { id } = await params;

    // Find the image with all enhancement jobs
    const image = await prisma.enhancedImage.findUnique({
      where: { id },
      include: {
        enhancementJobs: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Check if user has access (owner or public image)
    if (image.userId !== session.user.id && !image.isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate processing time for each job
    const versions = image.enhancementJobs
      .filter((job: EnhancementJob) => job.status === "COMPLETED")
      .map((job: EnhancementJob) => {
        const processingTimeMs = job.processingStartedAt && job.processingCompletedAt
          ? job.processingCompletedAt.getTime() - job.processingStartedAt.getTime()
          : null;

        return {
          jobId: job.id,
          tier: job.tier,
          status: job.status,
          resultUrl: job.enhancedUrl,
          tokensSpent: job.tokensCost,
          createdAt: job.createdAt,
          processingTimeMs,
          width: job.enhancedWidth,
          height: job.enhancedHeight,
          sizeBytes: job.enhancedSizeBytes,
        };
      });

    return NextResponse.json(
      {
        success: true,
        imageId: image.id,
        imageName: image.name,
        originalUrl: image.originalUrl,
        versions,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitConfigs.general.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
        },
      },
    );
  } catch (error) {
    console.error("Error in GET versions API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch versions" },
      { status: 500 },
    );
  }
}
