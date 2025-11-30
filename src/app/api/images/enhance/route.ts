import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { analyzeImage } from '@/lib/ai/gemini-client'
import { downloadFromR2, uploadToR2 } from '@/lib/storage/r2-client'
import prisma from '@/lib/prisma'
import { EnhancementTier, JobStatus } from '@prisma/client'
import sharp from 'sharp'

// Token costs for each tier
const TIER_COSTS = {
  TIER_1K: 2,
  TIER_2K: 5,
  TIER_4K: 10,
}

// Target resolutions for each tier
const TIER_RESOLUTIONS = {
  TIER_1K: 1024,
  TIER_2K: 2048,
  TIER_4K: 4096,
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

    // Validate tier
    if (!Object.keys(TIER_COSTS).includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Get image from database
    const image = await prisma.enhancedImage.findUnique({
      where: { id: imageId },
    })

    if (!image || image.userId !== session.user.id) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Check token balance
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

    // Consume tokens
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

    // Create enhancement job
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

    // Process enhancement in background (simplified for demo)
    // In production, this would be a queue job
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

/**
 * Process enhancement (simplified version for demo)
 * In production, this would use Imagen API
 */
async function processEnhancement(
  jobId: string,
  originalR2Key: string,
  tier: EnhancementTier,
  userId: string
) {
  try {
    // Download original image
    const originalBuffer = await downloadFromR2(originalR2Key)
    if (!originalBuffer) {
      throw new Error('Failed to download original image')
    }

    // Analyze with Gemini
    const base64Image = originalBuffer.toString('base64')
    const mimeType = 'image/jpeg' // Simplified - should detect actual type
    const analysis = await analyzeImage(base64Image, mimeType)

    // For demo: upscale using Sharp (in production, use Imagen)
    const targetSize = TIER_RESOLUTIONS[tier]
    const enhancedBuffer = await sharp(originalBuffer)
      .resize(targetSize, targetSize, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .sharpen()
      .jpeg({ quality: 95 })
      .toBuffer()

    const metadata = await sharp(enhancedBuffer).metadata()

    // Upload enhanced image
    const enhancedR2Key = originalR2Key.replace('/originals/', '/enhanced/')
    const uploadResult = await uploadToR2({
      key: enhancedR2Key,
      buffer: enhancedBuffer,
      contentType: 'image/jpeg',
      metadata: {
        tier,
        geminiAnalysis: JSON.stringify(analysis),
      },
    })

    if (!uploadResult.success) {
      throw new Error('Failed to upload enhanced image')
    }

    // Update job status
    await prisma.imageEnhancementJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        enhancedUrl: uploadResult.url,
        enhancedR2Key,
        enhancedWidth: metadata.width,
        enhancedHeight: metadata.height,
        enhancedSizeBytes: enhancedBuffer.length,
        geminiPrompt: analysis.enhancementPrompt,
        processingCompletedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Enhancement processing failed:', error)

    // Refund tokens and mark job as failed
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
