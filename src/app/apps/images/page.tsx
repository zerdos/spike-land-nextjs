import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ImagesAppClient } from './ImagesAppClient'

export const metadata: Metadata = {
  title: 'Image Enhancement App - Spike Land',
  description: 'AI-powered image enhancement dashboard',
}

export default async function ImagesAppPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/apps/images')
  }

  const enhancedImages = await prisma.enhancedImage.findMany({
    where: { userId: session.user.id },
    include: {
      enhancementJobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <ImagesAppClient images={enhancedImages} />
}
