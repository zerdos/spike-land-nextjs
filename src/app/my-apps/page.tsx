import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { MyAppsClient } from "./MyAppsClient"

export default async function MyAppsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const [apps, enhancedImages] = await Promise.all([
    prisma.app.findMany({
      where: {
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
      include: {
        requirements: true,
        monetizationModels: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.enhancedImage.findMany({
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
    }),
  ])

  return <MyAppsClient apps={apps} enhancedImages={enhancedImages} />
}
