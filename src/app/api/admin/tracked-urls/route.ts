/**
 * Tracked URLs Management API Route
 *
 * CRUD operations for tracked URLs (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const trackedUrls = await prisma.trackedUrl.findMany({
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    type TrackedUrlItem = {
      id: string;
      url: string;
      label: string | null;
      createdAt: Date;
      createdBy: { name: string | null; email: string | null; };
    };

    return NextResponse.json({
      trackedUrls: trackedUrls.map((u: TrackedUrlItem) => ({
        id: u.id,
        url: u.url,
        label: u.label,
        createdAt: u.createdAt.toISOString(),
        createdBy: {
          name: u.createdBy.name,
          email: u.createdBy.email,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch tracked URLs:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
    const { url, label } = body;

    // Validate input
    if (!url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 },
      );
    }

    // Check if URL already exists
    const existing = await prisma.trackedUrl.findUnique({
      where: { url },
    });

    if (existing) {
      return NextResponse.json(
        { error: "URL already tracked" },
        { status: 409 },
      );
    }

    // Create tracked URL
    const trackedUrl = await prisma.trackedUrl.create({
      data: {
        url,
        label: label || null,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      trackedUrl: {
        id: trackedUrl.id,
        url: trackedUrl.url,
        label: trackedUrl.label,
        createdAt: trackedUrl.createdAt.toISOString(),
        createdBy: {
          name: trackedUrl.createdBy.name,
          email: trackedUrl.createdBy.email,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create tracked URL:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Tracked URL ID required" },
        { status: 400 },
      );
    }

    await prisma.trackedUrl.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tracked URL:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
