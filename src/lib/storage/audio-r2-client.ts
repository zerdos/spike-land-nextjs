/**
 * Audio R2 Client - Cloudflare R2 storage for audio files
 * Resolves #332
 */

import { tryCatch } from "@/lib/try-catch";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Global type declaration for development caching
declare global {
  var __audioR2Client: S3Client | undefined;
  var __audioR2BucketName: string | undefined;
}

// Audio-specific constants
const MAX_AUDIO_SIZE_BYTES = 500 * 1024 * 1024; // 500MB max
const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
];

function getAudioR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_AUDIO_BUCKET_NAME?.trim() ||
    "audio-mixer";
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Cloudflare R2 credentials are not configured for audio storage",
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

function getAudioR2Client(): S3Client {
  // In development, always create fresh client to pick up env changes
  if (process.env.NODE_ENV === "development") {
    const config = getAudioR2Config();
    return new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  // Production: use global cache
  if (!global.__audioR2Client) {
    const config = getAudioR2Config();
    global.__audioR2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    global.__audioR2BucketName = config.bucket;
  }
  return global.__audioR2Client;
}

function getAudioBucketName(): string {
  if (process.env.NODE_ENV === "development") {
    return getAudioR2Config().bucket;
  }

  if (!global.__audioR2BucketName) {
    global.__audioR2BucketName = getAudioR2Config().bucket;
  }
  return global.__audioR2BucketName;
}

/**
 * Generate R2 key for an audio track
 * Pattern: users/{userId}/audio-projects/{projectId}/tracks/{trackId}.{format}
 */
export function generateAudioKey(
  userId: string,
  projectId: string,
  trackId: string,
  format: string,
): string {
  return `users/${userId}/audio-projects/${projectId}/tracks/${trackId}.${format}`;
}

/**
 * Generate R2 key for project metadata
 * Pattern: users/{userId}/audio-projects/{projectId}/metadata.json
 */
export function generateProjectMetadataKey(
  userId: string,
  projectId: string,
): string {
  return `users/${userId}/audio-projects/${projectId}/metadata.json`;
}

export interface UploadAudioParams {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadAudioResult {
  success: boolean;
  key: string;
  url: string;
  sizeBytes: number;
  error?: string;
}

export interface DeleteAudioResult {
  success: boolean;
  key: string;
  error?: string;
}

export interface AudioMetadata {
  key: string;
  size: number;
  lastModified?: Date;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Validate audio file before upload
 */
export function validateAudioFile(
  buffer: Buffer,
  contentType: string,
): { valid: boolean; error?: string; } {
  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      error:
        `File size ${buffer.length} exceeds maximum allowed size of ${MAX_AUDIO_SIZE_BYTES} bytes (500MB)`,
    };
  }

  if (!ALLOWED_AUDIO_MIME_TYPES.includes(contentType.toLowerCase())) {
    return {
      valid: false,
      error: `Content type '${contentType}' is not allowed. Allowed types: ${
        ALLOWED_AUDIO_MIME_TYPES.join(", ")
      }`,
    };
  }

  return { valid: true };
}

/**
 * Upload an audio file to Cloudflare R2
 */
export async function uploadAudioToR2(
  params: UploadAudioParams,
): Promise<UploadAudioResult> {
  const { key, buffer, contentType, metadata } = params;

  // Validate before upload
  const validation = validateAudioFile(buffer, contentType);
  if (!validation.valid) {
    return {
      success: false,
      key,
      url: "",
      sizeBytes: 0,
      error: validation.error,
    };
  }

  const client = getAudioR2Client();
  const bucket = getAudioBucketName();

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

  const { error } = await tryCatch(upload.done());
  if (error) {
    console.error("Error uploading audio to R2:", error);
    return {
      success: false,
      key,
      url: "",
      sizeBytes: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Construct the public URL
  const publicUrl = process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL?.trim() ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
  if (!publicUrl) {
    return {
      success: false,
      key,
      url: "",
      sizeBytes: 0,
      error: "CLOUDFLARE_R2_AUDIO_PUBLIC_URL is not configured",
    };
  }
  const url = `${publicUrl}/${key}`;

  return {
    success: true,
    key,
    url,
    sizeBytes: buffer.length,
  };
}

/**
 * Download an audio file from Cloudflare R2
 */
export async function downloadAudioFromR2(key: string): Promise<Buffer | null> {
  const client = getAudioR2Client();
  const bucket = getAudioBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const { data: response, error } = await tryCatch(client.send(command));
  if (error) {
    console.error("Error downloading audio from R2:", error);
    return null;
  }

  const chunks: Uint8Array[] = [];

  if (response.Body) {
    const { error: streamError } = await tryCatch(
      (async () => {
        for await (const chunk of response.Body!) {
          chunks.push(chunk);
        }
      })(),
    );
    if (streamError) {
      console.error("Error downloading audio from R2:", streamError);
      return null;
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Delete an audio file from Cloudflare R2
 */
export async function deleteAudioFromR2(
  key: string,
): Promise<DeleteAudioResult> {
  const client = getAudioR2Client();
  const bucket = getAudioBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const { error } = await tryCatch(client.send(command));
  if (error) {
    console.error("Error deleting audio from R2:", error);
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
 * Get metadata for an audio file
 */
export async function getAudioMetadata(
  key: string,
): Promise<AudioMetadata | null> {
  const client = getAudioR2Client();
  const bucket = getAudioBucketName();

  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const { data: response, error } = await tryCatch(client.send(command));
  if (error) {
    console.error("Error getting audio metadata from R2:", error);
    return null;
  }

  return {
    key,
    size: response.ContentLength || 0,
    lastModified: response.LastModified,
    contentType: response.ContentType,
    metadata: response.Metadata,
  };
}

/**
 * List audio files for a user's project
 */
export async function listProjectAudioFiles(
  userId: string,
  projectId: string,
): Promise<AudioMetadata[]> {
  const client = getAudioR2Client();
  const bucket = getAudioBucketName();
  const prefix = `users/${userId}/audio-projects/${projectId}/tracks/`;

  const files: AudioMetadata[] = [];
  let continuationToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const { data: response, error } = await tryCatch(client.send(command));
    if (error) {
      console.error("Error listing project audio files from R2:", error);
      return [];
    }

    if (response.Contents) {
      for (const object of response.Contents) {
        files.push({
          key: object.Key || "",
          size: object.Size || 0,
          lastModified: object.LastModified,
        });
      }
    }

    continuationToken = response.NextContinuationToken;
    hasMore = response.IsTruncated === true;
  }

  return files;
}

/**
 * Delete all audio files for a project
 */
export async function deleteProjectAudioFiles(
  userId: string,
  projectId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string; }> {
  const { data: files, error: listError } = await tryCatch(
    Promise.resolve(listProjectAudioFiles(userId, projectId)),
  );
  if (listError) {
    console.error("Error deleting project audio files from R2:", listError);
    return {
      success: false,
      deletedCount: 0,
      error: listError instanceof Error ? listError.message : "Unknown error",
    };
  }

  let deletedCount = 0;

  for (const file of files) {
    const result = await deleteAudioFromR2(file.key);
    if (result.success) {
      deletedCount++;
    }
  }

  // Also delete the project metadata file
  const metadataKey = generateProjectMetadataKey(userId, projectId);
  await deleteAudioFromR2(metadataKey);

  return {
    success: true,
    deletedCount,
  };
}

/**
 * Check if audio R2 is properly configured
 */
export function isAudioR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_ENDPOINT &&
    (process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL ||
      process.env.CLOUDFLARE_R2_PUBLIC_URL)
  );
}

/**
 * Get the public URL for an audio file
 */
export function getAudioPublicUrl(key: string): string {
  const publicUrl = process.env.CLOUDFLARE_R2_AUDIO_PUBLIC_URL?.trim() ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
  if (!publicUrl) {
    throw new Error("CLOUDFLARE_R2_AUDIO_PUBLIC_URL is not configured");
  }
  return `${publicUrl}/${key}`;
}
