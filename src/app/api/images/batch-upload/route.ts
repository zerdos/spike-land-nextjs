import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { deleteFromR2 } from "@/lib/storage/r2-client";
import { processAndUploadImage } from "@/lib/storage/upload-handler";
import { isSecureFilename } from "@/lib/upload/validation";
import { NextRequest, NextResponse } from "next/server";

const MAX_BATCH_SIZE = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_BATCH_SIZE = 50 * 1024 * 1024; // 50MB total

interface UploadResult {
  success: boolean;
  filename: string;
  imageId?: string;
  url?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  error?: string;
  errorType?: "validation" | "upload" | "database" | "unknown";
}

interface UploadedFileData {
  filename: string;
  r2Key: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({ requestId, route: "/api/images/batch-upload" });

  try {
    requestLogger.info("Batch upload request received");

    const session = await auth();
    if (!session?.user?.id) {
      requestLogger.warn("Unauthorized batch upload attempt");
      const errorMessage = getUserFriendlyError(new Error("Unauthorized"), 401);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: errorMessage.suggestion,
        },
        { status: 401, headers: { "X-Request-ID": requestId } },
      );
    }

    requestLogger.info("User authenticated", { userId: session.user.id });

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      `upload:${session.user.id}`,
      rateLimitConfigs.imageUpload,
    );

    if (rateLimitResult.isLimited) {
      requestLogger.warn("Rate limit exceeded", { userId: session.user.id });
      const errorMessage = getUserFriendlyError(new Error("Rate limit"), 429);
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: errorMessage.suggestion,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.resetAt),
            "X-Request-ID": requestId,
          },
        },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      requestLogger.warn("No files provided");
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please provide files to upload.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    if (files.length > MAX_BATCH_SIZE) {
      requestLogger.warn("Batch size exceeded", {
        fileCount: files.length,
        maxAllowed: MAX_BATCH_SIZE,
      });
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: `Please upload a maximum of ${MAX_BATCH_SIZE} files per batch.`,
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate filenames for security (prevent path traversal, hidden files, etc.)
    const invalidFilenames = files.filter((f) => !isSecureFilename(f.name)).map((f) => f.name);
    if (invalidFilenames.length > 0) {
      requestLogger.warn("Invalid filenames detected", { invalidFilenames });
      return NextResponse.json(
        { error: "Invalid filenames detected", invalidFilenames },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate all files before processing
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        requestLogger.warn("File size exceeded", { filename: file.name, size: file.size });
        const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
        return NextResponse.json(
          {
            error: errorMessage.message,
            title: errorMessage.title,
            suggestion: `File "${file.name}" exceeds maximum size of 10MB.`,
          },
          { status: 400, headers: { "X-Request-ID": requestId } },
        );
      }
      totalSize += file.size;
    }

    // Validate total batch size
    if (totalSize > MAX_TOTAL_BATCH_SIZE) {
      requestLogger.warn("Total batch size exceeded", {
        totalSize,
        maxAllowed: MAX_TOTAL_BATCH_SIZE,
      });
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: `Total batch size exceeds maximum of 50MB (current: ${
            Math.round(totalSize / 1024 / 1024)
          }MB).`,
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    requestLogger.info("Processing batch upload", {
      fileCount: files.length,
      totalSize,
      userId: session.user.id,
    });

    // Ensure user exists in database (upsert for JWT-based auth)
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      create: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });

    // PHASE 1: Upload all files to R2 first
    requestLogger.info("Starting R2 upload phase");
    const uploadedFiles: (UploadedFileData & { index: number; })[] = [];
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process and upload image to R2
        const result = await processAndUploadImage({
          buffer,
          originalFilename: file.name,
          userId: session.user.id,
        });

        if (!result.success) {
          results[i] = {
            success: false,
            filename: file.name,
            error: result.error || "Failed to upload image",
            errorType: "upload",
          };
          continue;
        }

        // Track successfully uploaded files for later database transaction
        uploadedFiles.push({
          index: i,
          filename: file.name,
          r2Key: result.r2Key,
          url: result.url,
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
          format: result.format,
        });

        // Placeholder - will be filled after transaction
        results[i] = {
          success: false,
          filename: file.name,
          error: "Pending database creation",
          errorType: "database",
        };
      } catch (error) {
        results[i] = {
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : "Upload failed",
          errorType: "unknown",
        };
      }
    }

    // If all files failed during upload, return early without database transaction
    if (uploadedFiles.length === 0) {
      requestLogger.warn("All files failed during R2 upload phase", {
        failureCount: results.filter(r => !r.success).length,
      });
      return NextResponse.json(
        {
          success: true,
          results,
          summary: {
            total: files.length,
            successful: 0,
            failed: results.length,
          },
        },
        { headers: { "X-Request-ID": requestId } },
      );
    }

    // PHASE 2: Create all database records in a single transaction
    requestLogger.info("Starting database transaction phase", {
      uploadedCount: uploadedFiles.length,
    });
    const successfulImageIds: string[] = [];

    try {
      // Execute transaction for all successfully uploaded files
      const enhancedImages = await prisma.$transaction(
        uploadedFiles.map((fileData) =>
          prisma.enhancedImage.create({
            data: {
              userId: session.user.id,
              name: fileData.filename,
              originalUrl: fileData.url,
              originalR2Key: fileData.r2Key,
              originalWidth: fileData.width,
              originalHeight: fileData.height,
              originalSizeBytes: fileData.sizeBytes,
              originalFormat: fileData.format,
              isPublic: false,
            },
          })
        ),
      );

      // Transaction succeeded - update results at correct indices
      for (let i = 0; i < enhancedImages.length; i++) {
        const img = enhancedImages[i];
        const fileData = uploadedFiles[i];
        if (!img || !fileData) continue;
        results[fileData.index] = {
          success: true,
          filename: img.name,
          imageId: img.id,
          url: img.originalUrl,
          width: img.originalWidth,
          height: img.originalHeight,
          size: img.originalSizeBytes,
          format: img.originalFormat,
        };
      }

      successfulImageIds.push(...enhancedImages.map((img) => img.id));

      requestLogger.info("Database transaction completed successfully", {
        successCount: enhancedImages.length,
      });
    } catch (error) {
      // Transaction failed - rollback ALL R2 uploads
      requestLogger.error(
        "Database transaction failed, cleaning up R2 files",
        error instanceof Error ? error : new Error(String(error)),
        { uploadedFileCount: uploadedFiles.length },
      );

      const cleanupPromises = uploadedFiles.map((fileData) =>
        deleteFromR2(fileData.r2Key).catch((deleteError) => {
          requestLogger.error(
            "Failed to cleanup R2 file",
            deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
            { r2Key: fileData.r2Key },
          );
          return { success: false };
        })
      );

      await Promise.allSettled(cleanupPromises);

      // Update results at correct indices for transaction failures
      for (const fileData of uploadedFiles) {
        results[fileData.index] = {
          success: false,
          filename: fileData.filename,
          error: error instanceof Error ? error.message : "Database transaction failed",
          errorType: "database" as const,
        };
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    requestLogger.info("Batch upload completed", {
      total: files.length,
      successful: successCount,
      failed: failureCount,
    });

    return NextResponse.json(
      {
        success: successCount > 0, // Partial success is still success
        results,
        summary: {
          total: files.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    requestLogger.error(
      "Unexpected error in batch upload API",
      error instanceof Error ? error : new Error(String(error)),
    );
    const errorMessage = getUserFriendlyError(
      error instanceof Error ? error : new Error("Batch upload failed"),
      500,
    );
    return NextResponse.json(
      {
        error: errorMessage.message,
        title: errorMessage.title,
        suggestion: errorMessage.suggestion,
      },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }
}
