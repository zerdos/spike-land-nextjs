/**
 * API Route: Adapt Creative
 * Issue: #567 (ORB-063)
 */

import { FormatAdapter } from "@/lib/creative/format-adapter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { postId, content, mediaUrl, formats, placements } = await request.json();

    if (!postId || !content || !mediaUrl || !formats || !placements) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const adapter = new FormatAdapter();
    const variants = await adapter.adaptCreative({
      postId,
      content,
      mediaUrl,
      formats,
      placements,
    });

    return NextResponse.json({
      success: true,
      data: { variants },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to adapt creative",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
