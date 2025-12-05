import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processAndUploadImage } from "@/lib/storage/upload-handler";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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
      return NextResponse.json(
        { error: result.error || "Failed to upload image" },
        { status: 500 },
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error in upload API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
