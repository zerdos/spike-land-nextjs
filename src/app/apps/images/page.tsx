import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ImagesAppClient } from "./ImagesAppClient"
import prisma from "@/lib/prisma"

export default async function ImagesAppPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
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
  })

  return <ImagesAppClient images={images} />
}
