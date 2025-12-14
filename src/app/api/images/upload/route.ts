import { auth } from "@/auth";
import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { generateRequestId, logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { processAndUploadImage } from "@/lib/storage/upload-handler";
import { isSecureFilename } from "@/lib/upload/validation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const requestLogger = logger.child({ requestId, route: "/api/images/upload" });

  try {
    requestLogger.info("Upload request received");

    const session = await auth();
    if (!session?.user?.id) {
      requestLogger.warn("Unauthorized upload attempt");
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
    const file = formData.get("file") as File;
    const albumId = formData.get("albumId") as string | null;

    if (!file) {
      requestLogger.warn("No file provided");
      const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
      return NextResponse.json(
        {
          error: errorMessage.message,
          title: errorMessage.title,
          suggestion: "Please provide a file to upload.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate filename for security (path traversal, hidden files)
    if (!isSecureFilename(file.name)) {
      requestLogger.warn("Insecure filename rejected", { filename: file.name });
      return NextResponse.json(
        {
          error:
            "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
        },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    // Validate albumId if provided
    if (albumId) {
      const album = await prisma.album.findFirst({
        where: {
          id: albumId,
          userId: session.user.id,
        },
      });
      if (!album) {
        requestLogger.warn("Invalid album ID", { albumId, userId: session.user.id });
        const errorMessage = getUserFriendlyError(new Error("Invalid input"), 400);
        return NextResponse.json(
          {
            error: errorMessage.message,
            title: errorMessage.title,
            suggestion: "Album not found or you don't have access to it.",
          },
          { status: 400, headers: { "X-Request-ID": requestId } },
        );
      }
    }

    requestLogger.info("Processing file upload", {
      filename: file.name,
      fileSize: file.size,
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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process and upload image
    const result = await processAndUploadImage({
      buffer,
      originalFilename: file.name,
      userId: session.user.id,
    });

    if (!result.success) {
      requestLogger.error("Upload processing failed", new Error(result.error || "Unknown error"), {
        filename: file.name,
        userId: session.user.id,
      });
      const errorMessage = getUserFriendlyError(
        new Error(result.error || "Upload processing failed"),
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

    // Create database record
    const enhancedImage = await prisma.enhancedImage.create({
      data: {
        userId: session.user.id,
        name: file.name,
        originalUrl: result.url,
        originalR2Key: result.r2Key,
        originalWidth: result.width,
        originalHeight: result.height,
        originalSizeBytes: result.sizeBytes,
        originalFormat: result.format,
        isPublic: false,
      },
    });

    // If albumId provided, create junction record to link image to album
    if (albumId) {
      await prisma.albumImage.create({
        data: {
          albumId,
          imageId: enhancedImage.id,
        },
      });
    }

    requestLogger.info("Upload completed successfully", {
      imageId: enhancedImage.id,
      filename: file.name,
    });

    return NextResponse.json(
      {
        success: true,
        image: {
          id: enhancedImage.id,
          name: enhancedImage.name,
          url: enhancedImage.originalUrl,
          width: enhancedImage.originalWidth,
          height: enhancedImage.originalHeight,
          size: enhancedImage.originalSizeBytes,
          format: enhancedImage.originalFormat,
        },
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    requestLogger.error(
      "Unexpected error in upload API",
      error instanceof Error ? error : new Error(String(error)),
    );
    const errorMessage = getUserFriendlyError(
      error instanceof Error ? error : new Error("Upload failed"),
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
