import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { EnhanceClient } from "./EnhanceClient";

interface EnhanceImagePageProps {
  params: Promise<{
    imageId: string;
  }>;
}

export default async function EnhanceImagePage({ params }: EnhanceImagePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const { imageId } = await params;

  // Fetch the image with all enhancement jobs
  const image = await prisma.enhancedImage.findUnique({
    where: {
      id: imageId,
    },
    include: {
      enhancementJobs: {
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
    redirect("/enhance");
  }

  return <EnhanceClient image={image} />;
}
