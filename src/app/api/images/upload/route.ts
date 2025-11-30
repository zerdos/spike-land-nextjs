import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { processAndUploadImage } from '@/lib/storage/upload-handler'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await processAndUploadImage({
      buffer,
      originalFilename: file.name,
      userId: session.user.id,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process image' },
        { status: 500 }
      )
    }

    const enhancedImage = await prisma.enhancedImage.create({
      data: {
        id: result.imageId,
        userId: session.user.id,
        name: file.name,
        originalUrl: result.url,
        originalR2Key: result.r2Key,
        originalWidth: result.width,
        originalHeight: result.height,
        originalSizeBytes: result.sizeBytes,
        originalFormat: result.format,
      },
    })

    return NextResponse.json({
      success: true,
      image: enhancedImage,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
