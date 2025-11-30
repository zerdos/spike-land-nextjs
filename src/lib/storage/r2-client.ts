import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
  throw new Error('Cloudflare R2 credentials are not configured')
}

// Create S3 client for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

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

/**
 * Upload an image to Cloudflare R2
 */
export async function uploadToR2(
  params: UploadImageParams
): Promise<UploadImageResult> {
  const { key, buffer, contentType, metadata } = params

  try {
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      },
    })

    await upload.done()

    // Construct the public URL (for demo - in production use presigned URLs)
    const url = `${endpoint}/${bucketName}/${key}`

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
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await r2Client.send(command)
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
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(accountId && accessKeyId && secretAccessKey && bucketName && endpoint)
}
