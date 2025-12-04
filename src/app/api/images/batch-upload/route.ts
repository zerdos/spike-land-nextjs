import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { processAndUploadImage } from '@/lib/storage/upload-handler'
import prisma from '@/lib/prisma'

const MAX_BATCH_SIZE = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_BATCH_SIZE = 50 * 1024 * 1024 // 50MB total

interface UploadResult {
  success: boolean
  filename: string
  imageId?: string
  url?: string
  width?: number
  height?: number
  size?: number
  format?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} files allowed per batch` },
        { status: 400 }
      )
    }

    // Validate all files before processing
    let totalSize = 0
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }
      totalSize += file.size
    }

    // Validate total batch size
    if (totalSize > MAX_TOTAL_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Total batch size exceeds maximum of 50MB (current: ${Math.round(totalSize / 1024 / 1024)}MB)` },
        { status: 400 }
      )
    }

    // Ensure user exists in database (upsert for JWT-based auth)
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      create: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    })

    // Process all files
    const results: UploadResult[] = []

    for (const file of files) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Process and upload image
        const result = await processAndUploadImage({
          buffer,
          originalFilename: file.name,
          userId: session.user.id,
        })

        if (!result.success) {
          results.push({
            success: false,
            filename: file.name,
            error: result.error || 'Failed to upload image',
          })
          continue
        }

        // Create database record
        const enhancedImage = await prisma.enhancedImage.create({
          data: {
            userId: session.user.id,
            name: file.name,
            originalUrl: result.url,
            originalR2Key: result.r2Key,
            originalWidth: result.width,
            originalHeight: result.height,
            originalSizeBytes: result.sizeBytes,
            originalFormat: result.format,
            isPublic: false,
          },
        })

        results.push({
          success: true,
          filename: file.name,
          imageId: enhancedImage.id,
          url: enhancedImage.originalUrl,
          width: enhancedImage.originalWidth,
          height: enhancedImage.originalHeight,
          size: enhancedImage.originalSizeBytes,
          format: enhancedImage.originalFormat,
        })
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: files.length,
        successful: successCount,
        failed: failureCount,
      },
    })
  } catch (error) {
    console.error('Error in batch upload API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch upload failed' },
      { status: 500 }
    )
  }
}
