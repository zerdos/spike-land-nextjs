import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { MixDetailClient } from "./MixDetailClient";

interface MixDetailPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function MixDetailPage({ params }: MixDetailPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { jobId } = await params;

  // Fetch the mix job with both parent images
  const job = await prisma.imageEnhancementJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      image: {
        select: {
          id: true,
          name: true,
          originalUrl: true,
          originalWidth: true,
          originalHeight: true,
        },
      },
      sourceImage: {
        select: {
          id: true,
          name: true,
          originalUrl: true,
          originalWidth: true,
          originalHeight: true,
        },
      },
    },
  });

  // Check if job exists
  if (!job) {
    notFound();
  }

  // Check if user owns this job
  if (job.userId !== session.user.id) {
    redirect("/apps/pixel");
  }

  // Check if this is a blend job (has sourceImageId or isBlend flag)
  // If not a blend, redirect to the standard image page
  if (!job.isBlend && !job.sourceImageId) {
    redirect(`/apps/pixel/${job.imageId}`);
  }

  return (
    <MixDetailClient
      job={{
        id: job.id,
        status: job.status,
        tier: job.tier,
        resultUrl: job.enhancedUrl,
        resultWidth: job.enhancedWidth,
        resultHeight: job.enhancedHeight,
        createdAt: job.createdAt.toISOString(),
        targetImage: {
          id: job.image.id,
          name: job.image.name,
          url: job.image.originalUrl,
          width: job.image.originalWidth || 0,
          height: job.image.originalHeight || 0,
        },
        sourceImage: job.sourceImage
          ? {
            id: job.sourceImage.id,
            name: job.sourceImage.name,
            url: job.sourceImage.originalUrl,
            width: job.sourceImage.originalWidth || 0,
            height: job.sourceImage.originalHeight || 0,
          }
          : null,
      }}
    />
  );
}
