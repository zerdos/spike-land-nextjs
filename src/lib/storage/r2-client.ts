import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

// Global type declaration for development caching
declare global {
  var __r2Client: S3Client | undefined
  var __r2BucketName: string | undefined
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error('Cloudflare R2 credentials are not configured')
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint }
}

function getR2Client(): S3Client {
  // In development, always create fresh client to pick up env changes
  // In production, use cached client for performance
  if (process.env.NODE_ENV === 'development') {
    const config = getR2Config()
    return new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true, // Required for Cloudflare R2 compatibility
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  // Production: use global cache to survive hot reloads
  if (!global.__r2Client) {
    const config = getR2Config()
    global.__r2Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true, // Required for Cloudflare R2 compatibility
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    global.__r2BucketName = config.bucket
  }
  return global.__r2Client
}

function getBucketName(): string {
  if (process.env.NODE_ENV === 'development') {
    return getR2Config().bucket
  }

  if (!global.__r2BucketName) {
    global.__r2BucketName = getR2Config().bucket
  }
  return global.__r2BucketName
}

export interface UploadImageParams {
  key: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export interface UploadImageResult {
  success: boolean
  key: string
  url: string
  error?: string
}

export interface DeleteImageResult {
  success: boolean
  key: string
  error?: string
}

/**
 * Upload an image to Cloudflare R2
 */
export async function uploadToR2(
  params: UploadImageParams
): Promise<UploadImageResult> {
  const { key, buffer, contentType, metadata } = params

  try {
    const client = getR2Client()
    const bucket = getBucketName()

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      },
    })

    await upload.done()

    // Construct the public URL (for demo - in production use presigned URLs)
    const config = getR2Config()
    const url = `${config.endpoint}/${bucket}/${key}`

    return {
      success: true,
      key,
      url,
    }
  } catch (error) {
    console.error('Error uploading to R2:', error)
    return {
      success: false,
      key,
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Download an image from Cloudflare R2
 */
export async function downloadFromR2(key: string): Promise<Buffer | null> {
  try {
    const client = getR2Client()
    const bucket = getBucketName()

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await client.send(command)
    const chunks: Uint8Array[] = []

    if (response.Body) {
      // @ts-expect-error - Body is a stream
      for await (const chunk of response.Body) {
        chunks.push(chunk)
      }
    }

    return Buffer.concat(chunks)
  } catch (error) {
    console.error('Error downloading from R2:', error)
    return null
  }
}

/**
 * Delete an image from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<DeleteImageResult> {
  try {
    const client = getR2Client()
    const bucket = getBucketName()

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await client.send(command)

    return {
      success: true,
      key,
    }
  } catch (error) {
    console.error('Error deleting from R2:', error)
    return {
      success: false,
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_ENDPOINT
  )
}
