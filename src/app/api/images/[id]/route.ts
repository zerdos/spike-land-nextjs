import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Find the image
    const image = await prisma.enhancedImage.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Check if user has access (owner or public image)
    if (image.userId !== session.user.id && !image.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        name: image.name,
        description: image.description,
        originalUrl: image.originalUrl,
        originalWidth: image.originalWidth,
        originalHeight: image.originalHeight,
        originalSizeBytes: image.originalSizeBytes,
        originalFormat: image.originalFormat,
        isPublic: image.isPublic,
        viewCount: image.viewCount,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        jobs: image.jobs.map(job => ({
          id: job.id,
          tier: job.tier,
          status: job.status,
          tokensCost: job.tokensCost,
          enhancedUrl: job.enhancedUrl,
          enhancedWidth: job.enhancedWidth,
          enhancedHeight: job.enhancedHeight,
          enhancedSizeBytes: job.enhancedSizeBytes,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          processingStartedAt: job.processingStartedAt,
          processingCompletedAt: job.processingCompletedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error in GET image API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch image' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Find the image and verify ownership
    const image = await prisma.enhancedImage.findUnique({
      where: { id },
      include: {
        jobs: true,
      },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (image.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the image (cascade will delete associated jobs)
    await prisma.enhancedImage.delete({
      where: { id },
    })

    // TODO: Consider deleting files from R2 storage as well
    // This would require implementing R2 delete functionality

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    })
  } catch (error) {
    console.error('Error in delete API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
