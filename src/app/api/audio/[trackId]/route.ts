/**
 * Audio Track API Route - GET and DELETE operations
 * Resolves #332
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  deleteAudioFromR2,
  downloadAudioFromR2,
  generateAudioKey,
  getAudioMetadata,
  isAudioR2Configured,
} from "@/lib/storage/audio-r2-client";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ trackId: string; }>;
}

/**
 * GET /api/audio/[trackId]
 * Download an audio file
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    const { trackId } = await params;
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const format = url.searchParams.get("format") || "wav";

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 },
      );
    }

    // Validate project ownership
    const project = await prisma.audioMixerProject.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Generate R2 key
    const key = generateAudioKey(session.user.id, projectId, trackId, format);

    // Download from R2
    const buffer = await downloadAudioFromR2(key);
    if (!buffer) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 },
      );
    }

    // Return the audio file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": `audio/${format}`,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${trackId}.${format}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error downloading audio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/audio/[trackId]
 * Delete an audio file
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { trackId } = await params;
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const format = url.searchParams.get("format") || "wav";

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 },
      );
    }

    // Validate project ownership
    const project = await prisma.audioMixerProject.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Generate R2 key
    const key = generateAudioKey(session.user.id, projectId, trackId, format);

    // Delete from R2
    const result = await deleteAudioFromR2(key);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Delete failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      key: result.key,
    });
  } catch (error) {
    console.error("Error deleting audio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * HEAD /api/audio/[trackId]
 * Get metadata for an audio file
 */
export async function HEAD(request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    // Check R2 configuration
    if (!isAudioR2Configured()) {
      return new NextResponse(null, { status: 503 });
    }

    const { trackId } = await params;
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const format = url.searchParams.get("format") || "wav";

    if (!projectId) {
      return new NextResponse(null, { status: 400 });
    }

    // Validate project ownership
    const project = await prisma.audioMixerProject.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return new NextResponse(null, { status: 404 });
    }

    // Generate R2 key
    const key = generateAudioKey(session.user.id, projectId, trackId, format);

    // Get metadata from R2
    const metadata = await getAudioMetadata(key);
    if (!metadata) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      headers: {
        "Content-Length": metadata.size.toString(),
        "Content-Type": metadata.contentType || `audio/${format}`,
        "Last-Modified": metadata.lastModified?.toUTCString() || "",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
