import { auth } from "@/auth";
import {
  convertImageFormat,
  type ExportFormat,
  getFileExtension,
  isValidFormat,
} from "@/lib/images/format-converter";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { downloadFromR2 } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/images/export
 *
 * Exports an enhanced image in the specified format.
 * Supports PNG, JPEG (with quality control), and WebP formats.
 *
 * Request body:
 * - imageId: string - ID of the enhanced image
 * - format: 'png' | 'jpeg' | 'webp' - Desired output format
 * - quality?: number - JPEG quality (70-100), optional
 *
 * Response:
 * - Success: Image blob with Content-Type header
 * - Error: JSON with error message
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError) {
    console.error("Error in export API:", authError);
    return NextResponse.json(
      {
        error: authError instanceof Error
          ? authError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const { data: rateLimitResult, error: rateLimitError } = await tryCatch(
    checkRateLimit(`export:${session.user.id}`, rateLimitConfigs.general),
  );

  if (rateLimitError) {
    console.error("Error in export API:", rateLimitError);
    return NextResponse.json(
      {
        error: rateLimitError instanceof Error
          ? rateLimitError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }

  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      {
        error: "Too many export requests",
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          ),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
        },
      },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    console.error("Error in export API:", parseError);
    return NextResponse.json(
      {
        error: parseError instanceof Error
          ? parseError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }
  const { imageId, format, quality } = body as {
    imageId: string;
    format: string;
    quality?: number;
  };

  // Validate required parameters
  if (!imageId || !format) {
    return NextResponse.json(
      { error: "Missing imageId or format" },
      { status: 400 },
    );
  }

  // Validate format
  if (!isValidFormat(format)) {
    return NextResponse.json(
      { error: "Invalid format. Must be png, jpeg, or webp" },
      { status: 400 },
    );
  }

  // Validate quality if provided
  if (quality !== undefined) {
    if (typeof quality !== "number" || quality < 70 || quality > 100) {
      return NextResponse.json(
        { error: "Quality must be between 70 and 100" },
        { status: 400 },
      );
    }
  }

  // Find the enhancement job
  const { data: job, error: jobError } = await tryCatch(
    prisma.imageEnhancementJob.findFirst({
      where: {
        id: imageId,
        userId: session.user.id,
        status: "COMPLETED",
      },
      include: {
        image: true,
      },
    }),
  );

  if (jobError) {
    console.error("Error in export API:", jobError);
    return NextResponse.json(
      {
        error: jobError instanceof Error
          ? jobError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }

  if (!job || !job.enhancedR2Key) {
    return NextResponse.json(
      { error: "Enhanced image not found" },
      { status: 404 },
    );
  }

  // Download the enhanced image from R2
  const { data: imageBuffer, error: downloadError } = await tryCatch(
    downloadFromR2(job.enhancedR2Key),
  );

  if (downloadError) {
    console.error("Error in export API:", downloadError);
    return NextResponse.json(
      {
        error: downloadError instanceof Error
          ? downloadError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }

  if (!imageBuffer) {
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 },
    );
  }

  // Convert to requested format
  const { data: convertResult, error: convertError } = await tryCatch(
    convertImageFormat(imageBuffer, {
      format: format as ExportFormat,
      quality,
    }),
  );

  if (convertError) {
    console.error("Error in export API:", convertError);
    return NextResponse.json(
      {
        error: convertError instanceof Error
          ? convertError.message
          : "Failed to export image",
      },
      { status: 500 },
    );
  }

  const { buffer, mimeType } = convertResult;

  // Generate filename
  const originalFilename = job.image.name.replace(/\.[^/.]+$/, "");
  const extension = getFileExtension(format as ExportFormat);
  const filename = `${originalFilename}_enhanced_${job.tier.toLowerCase()}.${extension}`;

  // Return the converted image
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
      "X-RateLimit-Remaining": String(rateLimitResult.remaining),
    },
  });
}
