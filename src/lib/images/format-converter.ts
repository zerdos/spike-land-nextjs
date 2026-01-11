import { tryCatch } from "@/lib/try-catch";
import type sharp from "sharp";
import { type ExportFormat } from "./format-utils";

// Dynamic import to avoid Vercel build failures
// (sharp requires native binaries that aren't available at build time)
async function getSharp(): Promise<typeof sharp> {
  return (await import("sharp")).default;
}

// Re-export for backward compatibility
export { type ExportFormat, getFileExtension, isValidFormat } from "./format-utils";

/**
 * Export options for image conversion
 */
interface ExportOptions {
  format: ExportFormat;
  quality?: number;
}

/**
 * Result of image format conversion
 */
interface ConversionResult {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Converts an image buffer to the specified format
 */
export async function convertImageFormat(
  inputBuffer: Buffer,
  options: ExportOptions,
): Promise<ConversionResult> {
  const { format, quality = 95 } = options;

  // Validate quality range
  if (quality < 1 || quality > 100) {
    throw new Error("Quality must be between 1 and 100");
  }

  // Get sharp instance (dynamically loaded)
  const sharpModule = await getSharp();
  let sharpInstance = sharpModule(inputBuffer);

  // Apply format-specific conversion
  switch (format) {
    case "png":
      sharpInstance = sharpInstance.png({
        compressionLevel: 9,
        palette: false,
      });
      break;
    case "jpeg":
      sharpInstance = sharpInstance.jpeg({
        quality,
        mozjpeg: true,
      });
      break;
    case "webp":
      sharpInstance = sharpInstance.webp({
        quality,
        effort: 4,
      });
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const { data: buffer, error } = await tryCatch(sharpInstance.toBuffer());

  if (error) {
    throw error;
  }

  return {
    buffer,
    mimeType: `image/${format}`,
    sizeBytes: buffer.length,
  };
}
