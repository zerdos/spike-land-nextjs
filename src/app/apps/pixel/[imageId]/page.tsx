import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { EnhanceClient } from "./EnhanceClient";

interface PixelImagePageProps {
  params: Promise<{
    imageId: string;
  }>;
}

export default async function PixelImagePage({ params }: PixelImagePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { imageId } = await params;

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
