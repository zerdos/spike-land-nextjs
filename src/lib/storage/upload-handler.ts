import sharp from 'sharp'
import { uploadToR2 } from './r2-client'
import crypto from 'crypto'

export interface ProcessImageParams {
  buffer: Buffer
  originalFilename: string
  userId: string
}

export interface ProcessImageResult {
  success: boolean
  imageId: string
  r2Key: string
  url: string
  width: number
  height: number
  sizeBytes: number
  format: string
  error?: string
}

const MAX_DIMENSION = 4096 // 4K max resolution

/**
 * Process and upload an image
 * - Validates image
 * - Resizes to max 4K if needed
 * - Uploads to R2
 */
export async function processAndUploadImage(
  params: ProcessImageParams
): Promise<ProcessImageResult> {
  const { buffer, originalFilename, userId } = params

  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height || !metadata.format) {
      return {
        success: false,
        imageId: '',
        r2Key: '',
        url: '',
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: '',
        error: 'Invalid image format',
      }
    }

    // Check if resize is needed (either dimension > 4K)
    let processedBuffer = buffer
    let finalWidth = metadata.width
    let finalHeight = metadata.height

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      // Calculate new dimensions maintaining aspect ratio
      const aspectRatio = metadata.width / metadata.height

      if (metadata.width > metadata.height) {
        finalWidth = MAX_DIMENSION
        finalHeight = Math.round(MAX_DIMENSION / aspectRatio)
      } else {
        finalHeight = MAX_DIMENSION
        finalWidth = Math.round(MAX_DIMENSION * aspectRatio)
      }

      // Resize image
      processedBuffer = await sharp(buffer)
        .resize(finalWidth, finalHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer()
    }

    // Generate unique image ID and R2 key
    const imageId = crypto.randomUUID()
    const extension = metadata.format
    const r2Key = `users/${userId}/originals/${imageId}.${extension}`

    // Upload to R2
    const uploadResult = await uploadToR2({
      key: r2Key,
      buffer: processedBuffer,
      contentType: `image/${extension}`,
      metadata: {
        userId,
        originalFilename,
        originalWidth: metadata.width.toString(),
        originalHeight: metadata.height.toString(),
        processedWidth: finalWidth.toString(),
        processedHeight: finalHeight.toString(),
      },
    })

    if (!uploadResult.success) {
      return {
        success: false,
        imageId: '',
        r2Key: '',
        url: '',
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: '',
        error: uploadResult.error,
      }
    }

    return {
      success: true,
      imageId,
      r2Key,
      url: uploadResult.url,
      width: finalWidth,
      height: finalHeight,
      sizeBytes: processedBuffer.length,
      format: extension,
    }
  } catch (error) {
    console.error('Error processing image:', error)
    return {
      success: false,
      imageId: '',
      r2Key: '',
      url: '',
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File | Buffer,
  maxSizeBytes = 50 * 1024 * 1024 // 50MB
): { valid: boolean; error?: string } {
  const size = Buffer.isBuffer(file) ? file.length : (file as File).size

  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeBytes / 1024 / 1024}MB`,
    }
  }

  // Additional validation can be added here (file type, etc.)

  return { valid: true }
}
