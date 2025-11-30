import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { enhanceImageWithGemini } from '@/lib/ai/gemini-client'
import { downloadFromR2, uploadToR2 } from '@/lib/storage/r2-client'
import prisma from '@/lib/prisma'
import { EnhancementTier, JobStatus } from '@prisma/client'
import sharp from 'sharp'

const TIER_COSTS = {
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10,
}

const TIER_TO_SIZE = {
  TIER_1K: '1K' as const,
  TIER_2K: '2K' as const,
  TIER_4K: '4K' as const,
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageId, tier } = body as { imageId: string; tier: EnhancementTier }

    if (!imageId || !tier) {
      return NextResponse.json(
        { error: 'Missing imageId or tier' },
        { status: 400 }
      )
    }

    if (!Object.keys(TIER_COSTS).includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const image = await prisma.enhancedImage.findUnique({
      where: { id: imageId },
    })

    if (!image || image.userId !== session.user.id) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const tokenCost = TIER_COSTS[tier]
    const hasEnough = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      tokenCost
    )

    if (!hasEnough) {
      return NextResponse.json(
        { error: 'Insufficient tokens', required: tokenCost },
        { status: 402 }
      )
    }

    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: tokenCost,
      source: 'image_enhancement',
      sourceId: imageId,
      metadata: { tier },
    })

    if (!consumeResult.success) {
      return NextResponse.json(
        { error: consumeResult.error || 'Failed to consume tokens' },
        { status: 500 }
      )
    }

    const job = await prisma.imageEnhancementJob.create({
      data: {
        imageId,
        userId: session.user.id,
        tier,
        tokensCost: tokenCost,
        status: JobStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    })

    processEnhancement(job.id, image.originalR2Key, tier, session.user.id).catch(
      (error) => {
        console.error('Enhancement failed:', error)
      }
    )

    return NextResponse.json({
      success: true,
      jobId: job.id,
      tokenCost,
      newBalance: consumeResult.balance,
    })
  } catch (error) {
    console.error('Error in enhance API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhancement failed' },
      { status: 500 }
    )
  }
}

async function processEnhancement(
  jobId: string,
  originalR2Key: string,
  tier: EnhancementTier,
  userId: string
) {
  try {
    const originalBuffer = await downloadFromR2(originalR2Key)
    if (!originalBuffer) {
      throw new Error('Failed to download original image')
    }

    // Get original image metadata for aspect ratio preservation
    const originalMetadata = await sharp(originalBuffer).metadata()
    const originalWidth = originalMetadata.width || 1024
    const originalHeight = originalMetadata.height || 1024

    const base64Image = originalBuffer.toString('base64')
    const mimeType = 'image/jpeg'

    const tierSize = TIER_TO_SIZE[tier]

    console.log(`Enhancing image with Gemini at ${tierSize} resolution...`)
    console.log(`Original dimensions: ${originalWidth}x${originalHeight}`)

    // Get Gemini-enhanced image (will be square)
    const geminiBuffer = await enhanceImageWithGemini({
      imageData: base64Image,
      mimeType,
      tier: tierSize,
      originalWidth,
      originalHeight,
    })

    // Resize Gemini output to match original aspect ratio
    const aspectRatio = originalWidth / originalHeight
    const tierResolution = tier === 'TIER_1K' ? 1024 : tier === 'TIER_2K' ? 2048 : 4096

    let targetWidth: number
    let targetHeight: number

    if (aspectRatio > 1) {
      // Landscape: width is larger
      targetWidth = tierResolution
      targetHeight = Math.round(tierResolution / aspectRatio)
    } else {
      // Portrait or square: height is larger or equal
      targetHeight = tierResolution
      targetWidth = Math.round(tierResolution * aspectRatio)
    }

    console.log(`Resizing Gemini output to preserve aspect ratio: ${targetWidth}x${targetHeight}`)

    // Resize the Gemini-enhanced image to match original aspect ratio
    const enhancedBuffer = await sharp(geminiBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'lanczos3',
      })
      .jpeg({ quality: 95 })
      .toBuffer()

    const metadata = await sharp(enhancedBuffer).metadata()

    const enhancedR2Key = originalR2Key.replace('/originals/', '/enhanced/')
    const uploadResult = await uploadToR2({
      key: enhancedR2Key,
      buffer: enhancedBuffer,
      contentType: 'image/jpeg',
      metadata: {
        tier,
      },
    })

    if (!uploadResult.success) {
      throw new Error('Failed to upload enhanced image')
    }

    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        enhancedUrl: uploadResult.url,
        enhancedR2Key,
        enhancedWidth: metadata.width,
        enhancedHeight: metadata.height,
        enhancedSizeBytes: enhancedBuffer.length,
        geminiPrompt: 'Enhanced with Gemini AI',
        processingCompletedAt: new Date(),
      },
    })

    console.log(`Enhancement completed successfully for job ${jobId}`)
    console.log(`Final dimensions: ${metadata.width}x${metadata.height}`)
  } catch (error) {
    console.error('Enhancement processing failed:', error)

    const job = await prisma.imageEnhancementJob.findUnique({
      where: { id: jobId },
    })

    if (job) {
      await TokenBalanceManager.refundTokens(
        userId,
        job.tokensCost,
        jobId,
        'Enhancement failed'
      )

      await prisma.imageEnhancementJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }
}
