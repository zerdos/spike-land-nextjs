import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { ENHANCEMENT_COSTS } from '@/lib/tokens/costs'
import prisma from '@/lib/prisma'
import { EnhancementTier, JobStatus } from '@prisma/client'

interface BatchEnhanceResult {
  success: boolean
  imageId: string
  jobId?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageIds, tier } = body as {
      imageIds: string[]
      tier: EnhancementTier
    }

    // Validate input
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid imageIds' },
        { status: 400 }
      )
    }

    if (!tier || !Object.keys(ENHANCEMENT_COSTS).includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Validate all images belong to user
    const images = await prisma.enhancedImage.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id,
      },
    })

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: 'One or more images not found or unauthorized' },
        { status: 404 }
      )
    }

    // Calculate total cost
    const tokenCost = ENHANCEMENT_COSTS[tier]
    const totalCost = tokenCost * imageIds.length

    // Check if user has enough tokens
    const hasEnough = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      totalCost
    )

    if (!hasEnough) {
      return NextResponse.json(
        { error: 'Insufficient tokens', required: totalCost },
        { status: 402 }
      )
    }

    // Consume tokens upfront for the entire batch
    const consumeResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: totalCost,
      source: 'batch_image_enhancement',
      sourceId: `batch-${Date.now()}`,
      metadata: { tier, imageCount: imageIds.length },
    })

    if (!consumeResult.success) {
      return NextResponse.json(
        { error: consumeResult.error || 'Failed to consume tokens' },
        { status: 500 }
      )
    }

    // Create enhancement jobs for all images
    const results: BatchEnhanceResult[] = []

    for (const imageId of imageIds) {
      try {
        const image = images.find((img) => img.id === imageId)
        if (!image) {
          results.push({
            success: false,
            imageId,
            error: 'Image not found',
          })
          continue
        }

        // Create job
        const job = await prisma.imageEnhancementJob.create({
          data: {
            imageId,
            userId: session.user.id,
            tier,
            tokensCost: tokenCost,
            status: JobStatus.PENDING,
          },
        })

        results.push({
          success: true,
          imageId,
          jobId: job.id,
        })

        // Start processing asynchronously (don't await)
        processEnhancementJob(job.id, image.originalR2Key, tier, session.user.id).catch(
          (error) => {
            console.error(`Enhancement job ${job.id} failed:`, error)
          }
        )
      } catch (error) {
        results.push({
          success: false,
          imageId,
          error: error instanceof Error ? error.message : 'Failed to create job',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    // If all jobs failed, refund tokens
    if (successCount === 0 && failureCount > 0) {
      await TokenBalanceManager.refundTokens(
        session.user.id,
        totalCost,
        `batch-${Date.now()}`,
        'All jobs failed'
      )
    }

    // If some jobs failed, refund partial amount
    if (failureCount > 0 && successCount > 0) {
      const refundAmount = failureCount * tokenCost
      await TokenBalanceManager.refundTokens(
        session.user.id,
        refundAmount,
        `batch-${Date.now()}`,
        `${failureCount} of ${imageIds.length} jobs failed`
      )
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: imageIds.length,
        successful: successCount,
        failed: failureCount,
        totalCost,
        newBalance: consumeResult.balance,
      },
    })
  } catch (error) {
    console.error('Error in batch enhance API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Batch enhancement failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Process a single enhancement job
 * This is a simplified version - in production, this would call the actual enhancement logic
 */
async function processEnhancementJob(
  jobId: string,
  originalR2Key: string,
  tier: EnhancementTier,
  userId: string
) {
  try {
    // Update job status to processing
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    })

    // Import the enhancement logic
    const { enhanceImageWithGemini } = await import('@/lib/ai/gemini-client')
    const { downloadFromR2, uploadToR2 } = await import('@/lib/storage/r2-client')
    const sharp = (await import('sharp')).default

    // Download original image
    const originalBuffer = await downloadFromR2(originalR2Key)
    if (!originalBuffer) {
      throw new Error('Failed to download original image')
    }

    // Get metadata
    const originalMetadata = await sharp(originalBuffer).metadata()
    const originalWidth = originalMetadata.width || 1024
    const originalHeight = originalMetadata.height || 1024
    const detectedFormat = originalMetadata.format
    const mimeType = detectedFormat
      ? `image/${detectedFormat === 'jpeg' ? 'jpeg' : detectedFormat}`
      : 'image/jpeg'

    // Pad to square
    const maxDimension = Math.max(originalWidth, originalHeight)
    const paddedBuffer = await sharp(originalBuffer)
      .resize(maxDimension, maxDimension, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .toBuffer()

    const base64Image = paddedBuffer.toString('base64')

    // Enhance with Gemini
    const tierSize = tier === 'TIER_1K' ? '1K' : tier === 'TIER_2K' ? '2K' : '4K'
    const geminiBuffer = await enhanceImageWithGemini({
      imageData: base64Image,
      mimeType,
      tier: tierSize as '1K' | '2K' | '4K',
      originalWidth,
      originalHeight,
    })

    // Process enhanced image (crop and resize)
    const geminiMetadata = await sharp(geminiBuffer).metadata()
    const geminiSize = geminiMetadata.width || maxDimension
    const aspectRatio = originalWidth / originalHeight

    let extractLeft = 0
    let extractTop = 0
    let extractWidth = geminiSize
    let extractHeight = geminiSize

    if (aspectRatio > 1) {
      extractHeight = Math.round(geminiSize / aspectRatio)
      extractTop = Math.round((geminiSize - extractHeight) / 2)
    } else {
      extractWidth = Math.round(geminiSize * aspectRatio)
      extractLeft = Math.round((geminiSize - extractWidth) / 2)
    }

    const tierResolutions = {
      TIER_1K: 1024,
      TIER_2K: 2048,
      TIER_4K: 4096,
    }
    const tierResolution = tierResolutions[tier]

    let targetWidth: number
    let targetHeight: number

    if (aspectRatio > 1) {
      targetWidth = tierResolution
      targetHeight = Math.round(tierResolution / aspectRatio)
    } else {
      targetHeight = tierResolution
      targetWidth = Math.round(tierResolution * aspectRatio)
    }

    const enhancedBuffer = await sharp(geminiBuffer)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      })
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'lanczos3',
      })
      .jpeg({ quality: 95 })
      .toBuffer()

    const metadata = await sharp(enhancedBuffer).metadata()

    // Upload enhanced image
    const enhancedR2Key = originalR2Key.replace('/originals/', '/enhanced/')
    const uploadResult = await uploadToR2({
      key: enhancedR2Key,
      buffer: enhancedBuffer,
      contentType: 'image/jpeg',
      metadata: { tier },
    })

    if (!uploadResult.success) {
      throw new Error('Failed to upload enhanced image')
    }

    // Update job with results
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
  } catch (error) {
    console.error(`Enhancement job ${jobId} failed:`, error)

    // Get job to refund tokens
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
