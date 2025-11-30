import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

let r2Client: S3Client | null = null
let bucketName: string | null = null

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
  if (!r2Client) {
    const config = getR2Config()
    r2Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    bucketName = config.bucket
  }
  return r2Client
}

function getBucketName(): string {
  if (!bucketName) {
    const config = getR2Config()
    bucketName = config.bucket
  }
  return bucketName
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

    // Use R2.dev public URL for serving images
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (!publicUrl) {
      throw new Error('CLOUDFLARE_R2_PUBLIC_URL is not configured')
    }
    const url = `${publicUrl}/${key}`

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

export function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_ENDPOINT
  )
}
