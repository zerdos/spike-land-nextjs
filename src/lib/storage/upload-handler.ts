import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import type sharp from "sharp";
import { uploadToR2 } from "./r2-client";

// Dynamic import to avoid Vercel build failures
// (sharp requires native binaries that aren't available at build time)
async function getSharp(): Promise<typeof sharp> {
  return (await import("sharp")).default;
}

interface ProcessImageParams {
  buffer: Buffer;
  originalFilename: string;
  userId: string;
}

interface ProcessImageResult {
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

const MAX_DIMENSION = 4096; // Max 4K resolution
const WEBP_QUALITY = 80; // WebP quality setting

/**
 * Process and upload an image
 * - Validates image
 * - Resizes to max 1024px if needed
 * - Converts to WebP format
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

  // Get sharp instance (dynamically loaded)
  const sharpModule = await getSharp();

  // Get image metadata
  const { data: metadata, error: metadataError } = await tryCatch(
    sharpModule(buffer).metadata(),
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

  // Calculate final dimensions (resize if needed)
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
  }

  // Process image: resize if needed and convert to WebP
  const { data: processedBuffer, error: processError } = await tryCatch(
    sharpModule(buffer)
      .resize(finalWidth, finalHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
  );

  if (processError) {
    console.error("Error processing image:", processError);
    return createErrorResult(
      processError instanceof Error ? processError.message : "Unknown error",
    );
  }

  // Generate unique image ID and R2 key (always .webp)
  const imageId = crypto.randomUUID();
  const extension = "webp";
  const r2Key = `users/${userId}/originals/${imageId}.${extension}`;

  // Upload to R2
  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploadToR2({
      key: r2Key,
      buffer: processedBuffer,
      contentType: "image/webp",
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
