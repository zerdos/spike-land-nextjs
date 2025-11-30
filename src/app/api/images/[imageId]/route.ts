import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { deleteFromR2 } from '@/lib/storage/r2-client'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageId } = await params

    // Get the image with all jobs
    const image = await prisma.enhancedImage.findUnique({
      where: { id: imageId },
      include: {
        enhancementJobs: true,
      },
    })

    if (!image || image.userId !== session.user.id) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Delete all enhanced versions from R2
    for (const job of image.enhancementJobs) {
      if (job.enhancedR2Key) {
        try {
          await deleteFromR2(job.enhancedR2Key)
        } catch (error) {
          console.error(`Failed to delete enhanced image ${job.enhancedR2Key}:`, error)
          // Continue deletion even if R2 delete fails
        }
      }
    }

    // Delete original from R2
    try {
      await deleteFromR2(image.originalR2Key)
    } catch (error) {
      console.error(`Failed to delete original image ${image.originalR2Key}:`, error)
      // Continue deletion even if R2 delete fails
    }

    // Refund tokens for failed jobs
    const failedJobs = image.enhancementJobs.filter(job => job.status === 'FAILED')
    for (const job of failedJobs) {
      if (job.tokensCost > 0) {
        await TokenBalanceManager.refundTokens({
          userId: session.user.id,
          amount: job.tokensCost,
          source: 'image_enhancement',
          sourceId: job.id,
          reason: 'Image deleted',
        })
      }
    }

    // Delete all enhancement jobs
    await prisma.imageEnhancementJob.deleteMany({
      where: { imageId },
    })

    // Delete the image
    await prisma.enhancedImage.delete({
      where: { id: imageId },
    })

    return NextResponse.json({
      success: true,
      message: 'Image and all enhancements deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    )
  }
}
