import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharePageClient } from "./SharePageClient";

interface SharePageProps {
  params: Promise<{ token: string; }>;
}

async function getImageByShareToken(token: string) {
  const image = await prisma.enhancedImage.findUnique({
    where: {
      shareToken: token,
    },
    include: {
      enhancementJobs: {
        where: {
          status: "COMPLETED",
          enhancedUrl: {
            not: null,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return image;
}

async function incrementViewCount(imageId: string) {
  try {
    await prisma.enhancedImage.update({
      where: { id: imageId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment view count:", error);
  }
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const image = await getImageByShareToken(token);

  if (!image) {
    return {
      title: "Image Not Found - Pixel",
      description: "The requested image could not be found.",
    };
  }

  const latestEnhancement = image.enhancementJobs[0];
  const ogImageUrl = latestEnhancement?.enhancedUrl ?? image.originalUrl;

  return {
    title: `${image.name} - Enhanced with Pixel`,
    description: image.description ?? `View this AI-enhanced image created with Pixel`,
    openGraph: {
      title: `${image.name} - Enhanced with Pixel`,
      description: image.description ?? `View this AI-enhanced image created with Pixel`,
      type: "website",
      siteName: "Pixel - AI Image Enhancement",
      images: [
        {
          url: ogImageUrl,
          width: latestEnhancement?.enhancedWidth ?? image.originalWidth,
          height: latestEnhancement?.enhancedHeight ?? image.originalHeight,
          alt: image.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${image.name} - Enhanced with Pixel`,
      description: image.description ?? `View this AI-enhanced image created with Pixel`,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const image = await getImageByShareToken(token);

  if (!image) {
    notFound();
  }

  const latestEnhancement = image.enhancementJobs[0];

  if (!latestEnhancement?.enhancedUrl) {
    notFound();
  }

  await incrementViewCount(image.id);

  return (
    <SharePageClient
      imageName={image.name}
      description={image.description}
      originalUrl={image.originalUrl}
      enhancedUrl={latestEnhancement.enhancedUrl}
      originalWidth={image.originalWidth}
      originalHeight={image.originalHeight}
    />
  );
}
