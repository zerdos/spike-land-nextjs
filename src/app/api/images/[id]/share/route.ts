import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const image = await prisma.enhancedImage.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        shareToken: true,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (image.shareToken) {
      return NextResponse.json({
        shareToken: image.shareToken,
        shareUrl: `https://spike.land/share/${image.shareToken}`,
      });
    }

    const shareToken = nanoid(12);

    await prisma.enhancedImage.update({
      where: { id },
      data: { shareToken },
    });

    return NextResponse.json({
      shareToken,
      shareUrl: `https://spike.land/share/${shareToken}`,
    });
  } catch (error) {
    console.error("Error in POST share API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate share link" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; }>; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const image = await prisma.enhancedImage.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        shareToken: true,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!image.shareToken) {
      return NextResponse.json({ shareToken: null, shareUrl: null });
    }

    return NextResponse.json({
      shareToken: image.shareToken,
      shareUrl: `https://spike.land/share/${image.shareToken}`,
    });
  } catch (error) {
    console.error("Error in GET share API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get share link" },
      { status: 500 },
    );
  }
}
