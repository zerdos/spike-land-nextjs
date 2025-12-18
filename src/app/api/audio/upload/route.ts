/**
 * Audio Upload API Route
 * Resolves #332
 */

import { auth } from "@/auth";
import {
  generateAudioKey,
  isAudioR2Configured,
  uploadAudioToR2,
} from "@/lib/storage/audio-r2-client";
import { NextResponse } from "next/server";

const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check R2 configuration
    if (!isAudioR2Configured()) {
      return NextResponse.json(
        { error: "Audio storage is not configured" },
        { status: 503 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const trackId = formData.get("trackId") as string | null;
    const format = formData.get("format") as string | null;
    const durationStr = formData.get("duration") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (!projectId || !trackId || !format) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, trackId, format" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of 500MB` },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate R2 key
    const key = generateAudioKey(session.user.id, projectId, trackId, format);

    // Upload to R2
    const result = await uploadAudioToR2({
      key,
      buffer,
      contentType: file.type || `audio/${format}`,
      metadata: {
        projectId,
        trackId,
        duration: durationStr || "0",
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
      sizeBytes: result.sizeBytes,
    });
  } catch (error) {
    console.error("Error in audio upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
