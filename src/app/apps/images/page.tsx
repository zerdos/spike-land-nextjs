import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ImagesAppClient } from "./ImagesAppClient";

export default async function ImagesAppPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const images = await prisma.enhancedImage.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      enhancementJobs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <ImagesAppClient images={images} />;
}
