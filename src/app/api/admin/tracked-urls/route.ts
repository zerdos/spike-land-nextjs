/**
 * Tracked Paths Management API Route
 *
 * CRUD operations for tracked paths (admin only).
 * Paths are stored without domain to work across environments (localhost, production).
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

    const trackedPaths = await prisma.trackedUrl.findMany({
      where: { isActive: true },
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

    type TrackedPathItem = {
      id: string;
      path: string;
      label: string | null;
      createdAt: Date;
      createdBy: { name: string | null; email: string | null; };
    };

    return NextResponse.json({
      trackedPaths: trackedPaths.map((p: TrackedPathItem) => ({
        id: p.id,
        path: p.path,
        label: p.label,
        createdAt: p.createdAt.toISOString(),
        createdBy: {
          name: p.createdBy.name,
          email: p.createdBy.email,
        },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch tracked paths:", error);
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
    const { path, label } = body;

    // Validate input
    if (!path) {
      return NextResponse.json(
        { error: "Missing required field: path" },
        { status: 400 },
      );
    }

    // Validate path format - must start with /
    if (!path.startsWith("/")) {
      return NextResponse.json(
        { error: "Path must start with /" },
        { status: 400 },
      );
    }

    // Reject full URLs - only paths allowed
    if (path.includes("://")) {
      return NextResponse.json(
        { error: "Provide a path (e.g., /custom-page), not a full URL" },
        { status: 400 },
      );
    }

    // Check if path already exists
    const existing = await prisma.trackedUrl.findUnique({
      where: { path },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Path already tracked" },
        { status: 409 },
      );
    }

    // Create tracked path
    const trackedPath = await prisma.trackedUrl.create({
      data: {
        path,
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
      trackedPath: {
        id: trackedPath.id,
        path: trackedPath.path,
        label: trackedPath.label,
        createdAt: trackedPath.createdAt.toISOString(),
        createdBy: {
          name: trackedPath.createdBy.name,
          email: trackedPath.createdBy.email,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create tracked path:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
    const { path, isActive } = body;

    if (!path || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: path, isActive" },
        { status: 400 },
      );
    }

    // Check if tracked path already exists
    const existing = await prisma.trackedUrl.findUnique({
      where: { path },
    });

    let trackedPath;

    if (existing) {
      // Update existing entry
      trackedPath = await prisma.trackedUrl.update({
        where: { path },
        data: { isActive },
      });
    } else {
      // Create new entry (for built-in sitemap paths being hidden for first time)
      trackedPath = await prisma.trackedUrl.create({
        data: {
          path,
          isActive,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      trackedPath: {
        id: trackedPath.id,
        path: trackedPath.path,
        isActive: trackedPath.isActive,
      },
    });
  } catch (error) {
    console.error("Failed to toggle visibility:", error);
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
    console.error("Failed to delete tracked path:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
