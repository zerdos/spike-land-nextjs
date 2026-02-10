import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EnhanceClient } from "./EnhanceClient";

interface PixelImagePageProps {
  params: Promise<{
    imageId: string;
  }>;
}

// E2E mock data factory - only used in non-production with bypass header
function createE2EMockImage(imageId: string) {
  const now = new Date();
  const base = {
    id: imageId,
    userId: "e2e-user-id",
    name: "Test Image",
    originalUrl: "https://placehold.co/1024x768",
    originalR2Key: "images/original.jpg",
    originalWidth: 1024,
    originalHeight: 768,
    originalSizeBytes: 500000,
    shareToken: `share-${imageId}`,
    createdAt: now,
    updatedAt: now,
  };

  const makeJob = (id: string, tier: string, cost: number) => ({
    id,
    userId: "e2e-user-id",
    imageId,
    tier,
    status: "COMPLETED" as const,
    creditsCost: cost,
    enhancedUrl: "https://placehold.co/2048x1536",
    enhancedR2Key: `images/enhanced-${tier}.jpg`,
    enhancedWidth: tier === "TIER_4K" ? 4096 : tier === "TIER_2K" ? 2048 : 1024,
    enhancedHeight: tier === "TIER_4K" ? 3072 : tier === "TIER_2K" ? 1536 : 768,
    enhancedSizeBytes: 1000000,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    geminiPrompt: null,
    geminiModel: null,
    geminiTemp: null,
    workflowRunId: null,
    createdAt: now,
    updatedAt: now,
    processingStartedAt: now,
    processingCompletedAt: now,
    currentStage: null,
    enhancementType: "STANDARD",
    analysisResult: null,
    analysisSource: null,
    wasCropped: false,
    cropDimensions: null,
    pipelineId: null,
    sourceImageId: null,
    isBlend: false,
    isAnonymous: false,
    altText: null,
    qualityScore: null,
    sourceImage: null,
  });

  // Vary mock data based on imageId pattern
  let enhancementJobs: ReturnType<typeof makeJob>[] = [];
  if (imageId.includes("enhanced")) {
    enhancementJobs = [makeJob("e2e-job-1", "TIER_1K", 2)];
  } else if (imageId.includes("multi")) {
    enhancementJobs = [
      makeJob("e2e-job-1", "TIER_1K", 2),
      makeJob("e2e-job-2", "TIER_2K", 5),
      makeJob("e2e-job-3", "TIER_4K", 10),
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...base, enhancementJobs } as any;
}

export default async function PixelImagePage({ params }: PixelImagePageProps) {
  // Check for E2E bypass (middleware already validated the header)
  const headersList = await headers();
  const e2eBypassHeader = headersList.get("x-e2e-auth-bypass");
  const isE2EBypass = e2eBypassHeader && process.env.E2E_BYPASS_SECRET &&
    e2eBypassHeader === process.env.E2E_BYPASS_SECRET &&
    process.env.NODE_ENV !== "production";

  const { imageId } = await params;

  if (isE2EBypass) {
    return <EnhanceClient image={createE2EMockImage(imageId)} />;
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/apps/pixel");
  }

  // Fetch the image with enhancement jobs (filter out CANCELLED - users don't see cancelled)
  const image = await prisma.enhancedImage.findUnique({
    where: {
      id: imageId,
    },
    include: {
      enhancementJobs: {
        where: {
          status: { not: "CANCELLED" },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          sourceImage: {
            select: {
              id: true,
              originalUrl: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Check if image exists
  if (!image) {
    notFound();
  }

  // Check if user owns this image
  if (image.userId !== session.user.id) {
    redirect("/apps/pixel");
  }

  return <EnhanceClient image={image} />;
}
