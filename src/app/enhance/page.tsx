import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { EnhancePageClient } from "./EnhancePageClient"

export default async function EnhancePage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Fetch user's images
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

  return <EnhancePageClient images={images} />
}
