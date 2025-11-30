import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EnhanceClient } from './EnhanceClient'

export const metadata: Metadata = {
  title: 'Enhance Image - Spike Land',
  description: 'Enhance your image with AI-powered quality improvements',
}

interface PageProps {
  params: Promise<{
    imageId: string
  }>
}

export default async function EnhanceImagePage({ params }: PageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/enhance')
  }

  const { imageId } = await params

  const image = await prisma.enhancedImage.findUnique({
    where: { id: imageId },
    include: {
      enhancementJobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!image || image.userId !== session.user.id) {
    notFound()
  }

  return <EnhanceClient image={image} />
}
