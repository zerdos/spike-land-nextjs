import { auth } from "@/auth";
import { analyzeAssetForLibrary } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { uploadToR2 } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { nanoid } from "nanoid";

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov files
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/**
 * Upload asset to workspace content library
 * POST /api/orbit/assets/upload
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  // Parse form data
  const { data: formData, error: formError } = await tryCatch(
    request.formData(),
  );

  if (formError || !formData) {
    return NextResponse.json(
      { error: "Invalid request: Failed to parse form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file || !workspaceId) {
    return NextResponse.json(
      { error: "Missing required fields: file and workspaceId" },
      { status: 400 },
    );
  }

  // Check permissions
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "asset:write"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate file size
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return NextResponse.json(
      {
        error: `File too large. Maximum size for ${
          isVideo ? "videos" : "images"
        } is ${maxSizeMB}MB`,
      },
      { status: 400 },
    );
  }

  // Validate folder exists if provided
  if (folderId) {
    const { data: folder, error: folderError } = await tryCatch(
      prisma.assetFolder.findUnique({
        where: { id: folderId, workspaceId },
      }),
    );

    if (folderError || !folder) {
      return NextResponse.json(
        { error: "Invalid folder ID" },
        { status: 400 },
      );
    }
  }

  // Convert file to buffer
  const { data: arrayBuffer, error: bufferError } = await tryCatch(
    file.arrayBuffer(),
  );

  if (bufferError || !arrayBuffer) {
    return NextResponse.json(
      { error: "Failed to read file data" },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(arrayBuffer);

  // Extract image dimensions if it's an image
  let width: number | undefined;
  let height: number | undefined;

  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    const { data: metadata, error: metaError } = await tryCatch(
      sharp(buffer).metadata(),
    );

    if (!metaError && metadata) {
      width = metadata.width;
      height = metadata.height;
    }
  }

  // Generate unique asset ID and R2 key
  const assetId = nanoid();
  const fileExtension = file.name.split(".").pop() || "bin";
  const r2Key = `content-library/${workspaceId}/${folderId || "root"}/${assetId}.${fileExtension}`;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "spike-land";

  // Upload to R2
  const { data: uploadResult, error: uploadError } = await tryCatch(
    uploadToR2({
      key: r2Key,
      buffer,
      contentType: file.type,
      metadata: {
        workspaceId,
        assetId,
        originalName: file.name,
      },
    }),
  );

  if (uploadError || !uploadResult?.success) {
    return NextResponse.json(
      {
        error: uploadResult?.error || "Failed to upload file to storage",
      },
      { status: 500 },
    );
  }

  // Create asset record in database
  const { data: asset, error: dbError } = await tryCatch(
    prisma.asset.create({
      data: {
        id: assetId,
        workspaceId,
        folderId: folderId || null,
        filename: file.name,
        fileType: file.type,
        sizeBytes: file.size,
        width,
        height,
        storageProvider: "R2",
        r2Bucket: bucket,
        r2Key,
        uploadedById: session?.user?.id ?? "",
      },
      include: {
        folder: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
  );

  if (dbError || !asset) {
    // Cleanup: delete uploaded file from R2
    await tryCatch(
      import("@/lib/storage/r2-client").then((mod) => mod.deleteFromR2(r2Key)),
    );

    return NextResponse.json(
      { error: "Failed to create asset record" },
      { status: 500 },
    );
  }

  // Trigger AI analysis in background (don't wait for it)
  // Only analyze images, not videos
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    analyzeAssetInBackground(assetId, buffer, file.type).catch((err) => {
      console.error("Background asset analysis failed:", err);
    });
  }

  return NextResponse.json(
    {
      success: true,
      asset: {
        ...asset,
        url: uploadResult.url,
      },
    },
    { status: 201 },
  );
}

/**
 * Background job to analyze asset and update database with AI results
 */
async function analyzeAssetInBackground(
  assetId: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<void> {
  try {
    // Run AI analysis
    const analysis = await analyzeAssetForLibrary(imageBuffer, mimeType);

    // Update asset with AI results
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        altText: analysis.altText,
        qualityScore: analysis.qualityScore,
        analysisJson: JSON.parse(JSON.stringify(analysis)),
      },
    });

    // Create tags and assignments
    const workspace = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { workspaceId: true, uploadedById: true },
    });

    if (!workspace) {
      console.error("Asset not found for tagging:", assetId);
      return;
    }

    // Upsert tags and create assignments
    for (const tagName of analysis.suggestedTags) {
      // Normalize tag name (lowercase, trim)
      const normalizedTagName = tagName.toLowerCase().trim();
      if (!normalizedTagName) continue;

      // Upsert tag
      const tag = await prisma.assetTag.upsert({
        where: {
          workspaceId_name: {
            workspaceId: workspace.workspaceId,
            name: normalizedTagName,
          },
        },
        create: {
          workspaceId: workspace.workspaceId,
          name: normalizedTagName,
        },
        update: {},
      });

      // Create tag assignment (skip if already exists)
      await prisma.assetTagAssignment.upsert({
        where: {
          assetId_tagId: {
            assetId,
            tagId: tag.id,
          },
        },
        create: {
          assetId,
          tagId: tag.id,
          assignedById: workspace.uploadedById,
        },
        update: {},
      });
    }

    console.log("Asset analysis completed successfully:", assetId);
  } catch (error) {
    console.error("Error in analyzeAssetInBackground:", error);
    // Don't throw - this is a background job
  }
}
