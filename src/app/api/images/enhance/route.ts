import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { ENHANCEMENT_COSTS } from '@/lib/tokens/costs'
import { enhanceImageWithGemini } from '@/lib/ai/gemini-client'
import { downloadFromR2, uploadToR2 } from '@/lib/storage/r2-client'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'
import prisma from '@/lib/prisma'
import { EnhancementTier, JobStatus } from '@prisma/client'
import sharp from 'sharp'

const TIER_TO_SIZE = {
  TIER_1K: '1K' as const,
  TIER_2K: '2K' as const,
  TIER_4K: '4K' as const,
}

// Resolution constants for each enhancement tier
const TIER_RESOLUTIONS = {
  TIER_1K: 1024,
  TIER_2K: 2048,
  TIER_4K: 4096,
} as const

// Image processing constants
const ENHANCED_JPEG_QUALITY = 95 // High quality for enhanced images
const DEFAULT_IMAGE_DIMENSION = 1024 // Fallback dimension if metadata unavailable
const PADDING_BACKGROUND = { r: 0, g: 0, b: 0, alpha: 1 } // Black background for letterboxing

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit before processing
    const rateLimitResult = checkRateLimit(
      `enhance:${session.user.id}`,
      rateLimitConfigs.imageEnhancement
    )

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
            ),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      )
    }

    const body = await request.json()
    const { imageId, tier } = body as { imageId: string; tier: EnhancementTier }

    if (!imageId || !tier) {
      return NextResponse.json(
        { error: 'Missing imageId or tier' },
        { status: 400 }
      )
    }

    if (!Object.keys(ENHANCEMENT_COSTS).includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const image = await prisma.enhancedImage.findUnique({
      where: { id: imageId },
    })

    if (!image || image.userId !== session.user.id) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const tokenCost = ENHANCEMENT_COSTS[tier]
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

/**
 * Process image enhancement with aspect ratio preservation
 * 
 * Algorithm:
 * 1. Pad input image to square (Gemini requires square inputs)
 * 2. Send to Gemini for enhancement
 * 3. Crop Gemini output back to original aspect ratio
 * 4. Resize to target tier resolution
 * 
 * @param jobId - Enhancement job ID
 * @param originalR2Key - R2 storage key for original image
 * @param tier - Enhancement tier (1K/2K/4K)
 * @param userId - User ID for token refunds on failure
 */
async function processEnhancement(
  jobId: string,
  originalR2Key: string,
  tier: EnhancementTier,
  userId: string
) {
  try {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Enhancement] Starting processEnhancement for job: ${jobId}`)
    }

    const originalBuffer = await downloadFromR2(originalR2Key)

    if (!originalBuffer) {
      throw new Error('Failed to download original image')
    }

    // Get original image metadata for aspect ratio preservation and MIME type detection
    const originalMetadata = await sharp(originalBuffer).metadata()
    const originalWidth = originalMetadata.width || DEFAULT_IMAGE_DIMENSION
    const originalHeight = originalMetadata.height || DEFAULT_IMAGE_DIMENSION

    // Detect actual MIME type from image buffer to prevent type confusion attacks
    const detectedFormat = originalMetadata.format
    const mimeType = detectedFormat
      ? `image/${detectedFormat === 'jpeg' ? 'jpeg' : detectedFormat}`
      : 'image/jpeg' // fallback for unknown formats

    // Pad image to square to preserve aspect ratio during Gemini generation
    const maxDimension = Math.max(originalWidth, originalHeight)
    const paddedBuffer = await sharp(originalBuffer)
      .resize(maxDimension, maxDimension, {
        fit: 'contain',
        background: PADDING_BACKGROUND
      })
      .toBuffer()

    const base64Image = paddedBuffer.toString('base64')

    const tierSize = TIER_TO_SIZE[tier]

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Enhancement] Enhancing image with Gemini at ${tierSize} resolution...`)
    }

    // Get Gemini-enhanced image (will be square)
    const geminiBuffer = await enhanceImageWithGemini({
      imageData: base64Image,
      mimeType,
      tier: tierSize,
      originalWidth,
      originalHeight,
    })

    // Calculate dimensions to crop back to original aspect ratio
    const geminiMetadata = await sharp(geminiBuffer).metadata()
    const geminiSize = geminiMetadata.width

    if (!geminiSize) {
      throw new Error('Failed to get Gemini output dimensions')
    }

    // Use original aspect ratio for precise calculations
    const aspectRatio = originalWidth / originalHeight

    let extractLeft = 0
    let extractTop = 0
    let extractWidth = geminiSize
    let extractHeight = geminiSize

    if (aspectRatio > 1) {
      // Landscape: content is full width, centered vertically
      extractHeight = Math.round(geminiSize / aspectRatio)
      extractTop = Math.round((geminiSize - extractHeight) / 2)
    } else {
      // Portrait/Square: content is full height, centered horizontally
      extractWidth = Math.round(geminiSize * aspectRatio)
      extractLeft = Math.round((geminiSize - extractWidth) / 2)
    }

    // Crop to remove padding and resize to target resolution
    const tierResolution = TIER_RESOLUTIONS[tier]

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
        height: extractHeight
      })
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'lanczos3',
      })
      .jpeg({ quality: ENHANCED_JPEG_QUALITY })
      .toBuffer()

    const metadata = await sharp(enhancedBuffer).metadata()

    // Generate unique R2 key for this enhancement job to prevent overwriting
    // Format: users/{userId}/enhanced/{imageId}/{jobId}.jpg
    const enhancedR2Key = originalR2Key
      .replace('/originals/', `/enhanced/`)
      .replace(/\.[^.]+$/, `/${jobId}.jpg`)

    const uploadResult = await uploadToR2({
      key: enhancedR2Key,
      buffer: enhancedBuffer,
      contentType: 'image/jpeg',
      metadata: {
        tier,
        jobId,
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Enhancement] Completed successfully for job ${jobId}`)
    }
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
