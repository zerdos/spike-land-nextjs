import { auth } from "@/auth";
import type { ReferenceImage } from "@/lib/ai/pipeline-types";
import prisma from "@/lib/prisma";
import { deleteFromR2, uploadToR2 } from "@/lib/storage/r2-client";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_REFERENCE_IMAGES = 3; // Maximum reference images per pipeline
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ReferenceImageUploadResult {
  success: boolean;
  referenceImage?: {
    url: string;
    r2Key: string;
    description?: string;
  };
  error?: string;
}

/**
 * POST /api/pipelines/reference-images
 * Upload a reference image for a pipeline's prompt configuration
 *
 * FormData:
 * - file: File (required) - The image file to upload
 * - pipelineId: string (required) - The pipeline to associate with
 * - description: string (optional) - Description of the reference image
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ReferenceImageUploadResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pipelineId = formData.get("pipelineId") as string | null;
    const description = formData.get("description") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: "File is required" },
        { status: 400 },
      );
    }

    if (!pipelineId) {
      return NextResponse.json(
        { success: false, error: "Pipeline ID is required" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Check pipeline exists and user owns it
    const pipeline = await prisma.enhancementPipeline.findUnique({
      where: { id: pipelineId },
      select: {
        id: true,
        userId: true,
        promptConfig: true,
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: "Pipeline not found" },
        { status: 404 },
      );
    }

    if (pipeline.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "You can only upload reference images to your own pipelines" },
        { status: 403 },
      );
    }

    // Check current reference image count
    const promptConfig = (pipeline.promptConfig as Record<string, unknown>) || {};
    const existingRefs = (promptConfig.referenceImages as ReferenceImage[]) || [];

    if (existingRefs.length >= MAX_REFERENCE_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_REFERENCE_IMAGES} reference images allowed per pipeline`,
        },
        { status: 400 },
      );
    }

    // Process image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image metadata and validate
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) {
      return NextResponse.json(
        { success: false, error: "Invalid image format" },
        { status: 400 },
      );
    }

    // Resize if needed (max 1024px on longest side for reference images)
    const MAX_REF_DIMENSION = 1024;
    let processedBuffer: Buffer = buffer;

    if (metadata.width > MAX_REF_DIMENSION || metadata.height > MAX_REF_DIMENSION) {
      processedBuffer = await sharp(buffer)
        .resize(MAX_REF_DIMENSION, MAX_REF_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer();
    }

    // Generate unique ID and R2 key
    const imageId = crypto.randomUUID();
    const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;
    const r2Key = `pipelines/${pipelineId}/references/${imageId}.${extension}`;

    // Upload to R2
    const uploadResult = await uploadToR2({
      key: r2Key,
      buffer: processedBuffer,
      contentType: `image/${metadata.format}`,
      metadata: {
        pipelineId,
        userId: session.user.id,
        description: description || "",
      },
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Failed to upload image" },
        { status: 500 },
      );
    }

    // Update pipeline's promptConfig with new reference image
    const newReferenceImage: ReferenceImage = {
      url: uploadResult.url,
      r2Key,
      ...(description && { description }),
    };

    const updatedReferenceImages: ReferenceImage[] = [...existingRefs, newReferenceImage];

    await prisma.enhancementPipeline.update({
      where: { id: pipelineId },
      data: {
        promptConfig: {
          ...promptConfig,
          referenceImages: updatedReferenceImages,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      referenceImage: newReferenceImage,
    });
  } catch (error) {
    console.error("Error uploading reference image:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload reference image",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pipelines/reference-images
 * Remove a reference image from a pipeline
 *
 * Body:
 * - pipelineId: string (required) - The pipeline ID
 * - r2Key: string (required) - The R2 key of the image to remove
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { pipelineId, r2Key } = body;

    if (!pipelineId || !r2Key) {
      return NextResponse.json(
        { success: false, error: "Pipeline ID and R2 key are required" },
        { status: 400 },
      );
    }

    // Check pipeline exists and user owns it
    const pipeline = await prisma.enhancementPipeline.findUnique({
      where: { id: pipelineId },
      select: {
        id: true,
        userId: true,
        promptConfig: true,
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: "Pipeline not found" },
        { status: 404 },
      );
    }

    if (pipeline.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "You can only delete reference images from your own pipelines" },
        { status: 403 },
      );
    }

    // Remove from R2
    const deleteResult = await deleteFromR2(r2Key);
    if (!deleteResult.success) {
      console.error("Failed to delete from R2:", deleteResult.error);
      // Continue anyway to clean up database
    }

    // Update pipeline's promptConfig to remove the reference image
    const promptConfig = (pipeline.promptConfig as Record<string, unknown>) || {};
    const existingRefs = (promptConfig.referenceImages as ReferenceImage[]) || [];
    const updatedRefs = existingRefs.filter((ref) => ref.r2Key !== r2Key);

    await prisma.enhancementPipeline.update({
      where: { id: pipelineId },
      data: {
        promptConfig: {
          ...promptConfig,
          referenceImages: updatedRefs,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reference image:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete reference image",
      },
      { status: 500 },
    );
  }
}
