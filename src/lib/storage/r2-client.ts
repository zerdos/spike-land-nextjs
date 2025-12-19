import { tryCatch } from "@/lib/try-catch";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Global type declaration for development caching
declare global {
  var __r2Client: S3Client | undefined;
  var __r2BucketName: string | undefined;
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("Cloudflare R2 credentials are not configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

function getR2Client(): S3Client {
  // In development, always create fresh client to pick up env changes
  // In production, use cached client for performance
  if (process.env.NODE_ENV === "development") {
    const config = getR2Config();
    return new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true, // Required for Cloudflare R2 compatibility
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  // Production: use global cache to survive hot reloads
  if (!global.__r2Client) {
    const config = getR2Config();
    global.__r2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true, // Required for Cloudflare R2 compatibility
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    global.__r2BucketName = config.bucket;
  }
  return global.__r2Client;
}

function getBucketName(): string {
  if (process.env.NODE_ENV === "development") {
    return getR2Config().bucket;
  }

  if (!global.__r2BucketName) {
    global.__r2BucketName = getR2Config().bucket;
  }
  return global.__r2BucketName;
}

export interface UploadImageParams {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadImageResult {
  success: boolean;
  key: string;
  url: string;
  error?: string;
}

export interface DeleteImageResult {
  success: boolean;
  key: string;
  error?: string;
}

/**
 * Upload an image to Cloudflare R2
 */
export async function uploadToR2(
  params: UploadImageParams,
): Promise<UploadImageResult> {
  const { key, buffer, contentType, metadata } = params;

  const uploadOperation = async () => {
    const client = getR2Client();
    const bucket = getBucketName();

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      },
    });

    await upload.done();

    // Construct the public URL using the R2 public domain
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
    if (!publicUrl) {
      throw new Error("CLOUDFLARE_R2_PUBLIC_URL is not configured");
    }
    return `${publicUrl}/${key}`;
  };

  const { data: url, error } = await tryCatch(uploadOperation());

  if (error) {
    console.error("Error uploading to R2:", error);
    return {
      success: false,
      key,
      url: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return {
    success: true,
    key,
    url,
  };
}

/**
 * Download an image from Cloudflare R2
 */
export async function downloadFromR2(key: string): Promise<Buffer | null> {
  const downloadOperation = async () => {
    const client = getR2Client();
    const bucket = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      // @ts-expect-error - Body is a stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  };

  const { data, error } = await tryCatch(downloadOperation());

  if (error) {
    console.error("Error downloading from R2:", error);
    return null;
  }

  return data;
}

/**
 * Delete an image from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<DeleteImageResult> {
  const deleteOperation = async () => {
    const client = getR2Client();
    const bucket = getBucketName();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  };

  const { error } = await tryCatch(deleteOperation());

  if (error) {
    console.error("Error deleting from R2:", error);
    return {
      success: false,
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return {
    success: true,
    key,
  };
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
    process.env.CLOUDFLARE_R2_ENDPOINT &&
    process.env.CLOUDFLARE_R2_PUBLIC_URL
  );
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  averageSizeBytes: number;
  byFileType: Record<string, { count: number; sizeBytes: number; }>;
}

export interface ListStorageResult {
  success: boolean;
  stats: StorageStats | null;
  error?: string;
}

/**
 * List all objects in R2 bucket and calculate storage statistics
 */
export async function listR2StorageStats(): Promise<ListStorageResult> {
  const listOperation = async () => {
    const client = getR2Client();
    const bucket = getBucketName();

    const stats: StorageStats = {
      totalFiles: 0,
      totalSizeBytes: 0,
      averageSizeBytes: 0,
      byFileType: {},
    };

    let continuationToken: string | undefined;
    let hasMore = true;

    // Paginate through all objects
    while (hasMore) {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          const size = object.Size || 0;
          stats.totalFiles++;
          stats.totalSizeBytes += size;

          // Extract file extension
          const key = object.Key || "";
          const ext = key.includes(".")
            ? key.split(".").pop()?.toLowerCase() || "unknown"
            : "unknown";

          if (!stats.byFileType[ext]) {
            stats.byFileType[ext] = { count: 0, sizeBytes: 0 };
          }
          stats.byFileType[ext].count++;
          stats.byFileType[ext].sizeBytes += size;
        }
      }

      continuationToken = response.NextContinuationToken;
      hasMore = response.IsTruncated === true;
    }

    // Calculate average
    if (stats.totalFiles > 0) {
      stats.averageSizeBytes = Math.round(
        stats.totalSizeBytes / stats.totalFiles,
      );
    }

    return stats;
  };

  const { data: stats, error } = await tryCatch(listOperation());

  if (error) {
    console.error("Error listing R2 storage:", error);
    return {
      success: false,
      stats: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return {
    success: true,
    stats,
  };
}
