import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import sharp from "sharp";
import { uploadToR2 } from "./r2-client";

export interface ProcessImageParams {
  buffer: Buffer;
  originalFilename: string;
  userId: string;
}

export interface ProcessImageResult {
  success: boolean;
  imageId: string;
  r2Key: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  error?: string;
}

const MAX_DIMENSION = 4096; // 4K max resolution

/**
 * Process and upload an image
 * - Validates image
 * - Resizes to max 4K if needed
 * - Uploads to R2
 */
export async function processAndUploadImage(
  params: ProcessImageParams,
): Promise<ProcessImageResult> {
  const { buffer, originalFilename, userId } = params;

  const createErrorResult = (errorMessage: string): ProcessImageResult => ({
    success: false,
    imageId: "",
    r2Key: "",
    url: "",
    width: 0,
    height: 0,
    sizeBytes: 0,
    format: "",
    error: errorMessage,
  });

  // Get image metadata
  const { data: metadata, error: metadataError } = await tryCatch(
    sharp(buffer).metadata(),
  );

  if (metadataError) {
    console.error("Error processing image:", metadataError);
    return createErrorResult(
      metadataError instanceof Error ? metadataError.message : "Unknown error",
    );
  }

  if (!metadata.width || !metadata.height || !metadata.format) {
    return createErrorResult("Invalid image format");
  }

  // Check if resize is needed (either dimension > 4K)
  let processedBuffer = buffer;
  let finalWidth = metadata.width;
  let finalHeight = metadata.height;

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = metadata.width / metadata.height;

    if (metadata.width > metadata.height) {
      finalWidth = MAX_DIMENSION;
      finalHeight = Math.round(MAX_DIMENSION / aspectRatio);
    } else {
      finalHeight = MAX_DIMENSION;
      finalWidth = Math.round(MAX_DIMENSION * aspectRatio);
    }

    // Resize image
    const { data: resizedBuffer, error: resizeError } = await tryCatch(
      sharp(buffer)
        .resize(finalWidth, finalHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer(),
    );

    if (resizeError) {
      console.error("Error processing image:", resizeError);
      return createErrorResult(
        resizeError instanceof Error ? resizeError.message : "Unknown error",
      );
    }

    processedBuffer = resizedBuffer;
  }

  // Generate unique image ID and R2 key
  const imageId = crypto.randomUUID();
  const extension = metadata.format;
  const r2Key = `users/${userId}/originals/${imageId}.${extension}`;

  // Upload to R2
  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploadToR2({
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
    }),
  );

  if (uploadError) {
    console.error("Error processing image:", uploadError);
    return createErrorResult(
      uploadError instanceof Error ? uploadError.message : "Unknown error",
    );
  }

  if (!uploadResult.success) {
    return createErrorResult(uploadResult.error ?? "Upload failed");
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
  };
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File | Buffer,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
): { valid: boolean; error?: string; } {
  const size = Buffer.isBuffer(file) ? file.length : (file as File).size;

  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeBytes / 1024 / 1024}MB`,
    };
  }

  // Additional validation can be added here (file type, etc.)

  return { valid: true };
}
