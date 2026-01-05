import { auth } from "@/auth";
import { hasWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { isR2Configured, uploadToR2 } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for brand assets
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

interface UploadResult {
  success: boolean;
  url: string;
  r2Key: string;
  width?: number;
  height?: number;
  contentType: string;
  size: number;
}

// POST /api/brand-assets/upload
// Upload a brand asset (logo, etc.) to R2
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if R2 is configured
  if (!isR2Configured()) {
    console.error("R2 storage is not configured");
    return NextResponse.json(
      { error: "Storage service not configured" },
      { status: 503 },
    );
  }

  // Parse form data
  const { data: formData, error: formError } = await tryCatch(request.formData());

  if (formError) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;
  const assetType = (formData.get("assetType") as string) || "logo";

  // Validate required fields
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  // Check workspace permission
  const hasPermission = await hasWorkspacePermission(
    session.user.id,
    workspaceId,
    "brand:write",
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: "You don't have permission to upload brand assets for this workspace" },
      { status: 403 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Convert file to buffer
  const { data: arrayBuffer, error: bufferError } = await tryCatch(file.arrayBuffer());

  if (bufferError) {
    console.error("Failed to read file:", bufferError);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }

  let buffer = Buffer.from(arrayBuffer);
  let width: number | undefined;
  let height: number | undefined;
  let contentType = file.type;

  // Process image with sharp (except SVG)
  if (file.type !== "image/svg+xml") {
    const { data: metadata, error: metadataError } = await tryCatch(
      sharp(buffer).metadata(),
    );

    if (!metadataError && metadata) {
      width = metadata.width;
      height = metadata.height;

      // Optimize the image (resize if too large, convert to webp for efficiency)
      const MAX_DIMENSION = 1024;
      if (
        (metadata.width && metadata.width > MAX_DIMENSION) ||
        (metadata.height && metadata.height > MAX_DIMENSION)
      ) {
        const { data: optimizedBuffer, error: resizeError } = await tryCatch(
          sharp(buffer)
            .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer(),
        );

        if (!resizeError && optimizedBuffer) {
          buffer = Buffer.from(optimizedBuffer);
          contentType = "image/webp";

          // Get new dimensions
          const { data: newMetadata } = await tryCatch(sharp(buffer).metadata());
          if (newMetadata) {
            width = newMetadata.width;
            height = newMetadata.height;
          }
        }
      }
    }
  }

  // Generate R2 key
  const timestamp = Date.now();
  const extension = contentType === "image/svg+xml" ? "svg" : contentType.split("/")[1];
  const r2Key = `brand-assets/${workspaceId}/${assetType}-${timestamp}.${extension}`;

  // Upload to R2
  const uploadResult = await uploadToR2({
    key: r2Key,
    buffer,
    contentType,
    metadata: {
      workspaceId,
      assetType,
      originalName: file.name,
      uploadedBy: session.user.id,
    },
  });

  if (!uploadResult.success) {
    console.error("Failed to upload to R2:", uploadResult.error);
    return NextResponse.json(
      { error: "Failed to upload file to storage" },
      { status: 500 },
    );
  }

  const result: UploadResult = {
    success: true,
    url: uploadResult.url,
    r2Key: uploadResult.key,
    width,
    height,
    contentType,
    size: buffer.length,
  };

  return NextResponse.json(result);
}
