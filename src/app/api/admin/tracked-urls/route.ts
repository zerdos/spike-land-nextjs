/**
 * Tracked Paths Management API Route
 *
 * CRUD operations for tracked paths (admin only).
 * Paths are stored without domain to work across environments (localhost, production).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Helper function to handle errors consistently across all handlers
 */
function handleError(error: Error, logMessage: string): NextResponse {
  console.error(logMessage, error);
  if (error.message.includes("Forbidden")) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    return handleError(authError, "Failed to fetch tracked paths:");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return handleError(adminError, "Failed to fetch tracked paths:");
  }

  const { data: trackedPaths, error: fetchError } = await tryCatch(
    prisma.trackedUrl.findMany({
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
    }),
  );

  if (fetchError) {
    return handleError(fetchError, "Failed to fetch tracked paths:");
  }

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
}

export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    return handleError(authError, "Failed to create tracked path:");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return handleError(adminError, "Failed to create tracked path:");
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return handleError(parseError, "Failed to create tracked path:");
  }

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
  const { data: existing, error: findError } = await tryCatch(
    prisma.trackedUrl.findUnique({
      where: { path },
    }),
  );

  if (findError) {
    return handleError(findError, "Failed to create tracked path:");
  }

  if (existing) {
    return NextResponse.json({ error: "Path already tracked" }, {
      status: 409,
    });
  }

  // Create tracked path
  const { data: trackedPath, error: createError } = await tryCatch(
    prisma.trackedUrl.create({
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
    }),
  );

  if (createError) {
    return handleError(createError, "Failed to create tracked path:");
  }

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
}

export async function PATCH(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    return handleError(authError, "Failed to toggle visibility:");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return handleError(adminError, "Failed to toggle visibility:");
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return handleError(parseError, "Failed to toggle visibility:");
  }

  const { path, isActive } = body;

  if (!path || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "Missing required fields: path, isActive" },
      { status: 400 },
    );
  }

  // Check if tracked path already exists
  const { data: existing, error: findError } = await tryCatch(
    prisma.trackedUrl.findUnique({
      where: { path },
    }),
  );

  if (findError) {
    return handleError(findError, "Failed to toggle visibility:");
  }

  let trackedPath;

  if (existing) {
    // Update existing entry
    const { data: updated, error: updateError } = await tryCatch(
      prisma.trackedUrl.update({
        where: { path },
        data: { isActive },
      }),
    );

    if (updateError) {
      return handleError(updateError, "Failed to toggle visibility:");
    }

    trackedPath = updated;
  } else {
    // Create new entry (for built-in sitemap paths being hidden for first time)
    const { data: created, error: createError } = await tryCatch(
      prisma.trackedUrl.create({
        data: {
          path,
          isActive,
          createdById: session.user.id,
        },
      }),
    );

    if (createError) {
      return handleError(createError, "Failed to toggle visibility:");
    }

    trackedPath = created;
  }

  return NextResponse.json({
    trackedPath: {
      id: trackedPath.id,
      path: trackedPath.path,
      isActive: trackedPath.isActive,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    return handleError(authError, "Failed to delete tracked path:");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return handleError(adminError, "Failed to delete tracked path:");
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Tracked URL ID required" },
      { status: 400 },
    );
  }

  const { error: deleteError } = await tryCatch(
    prisma.trackedUrl.delete({
      where: { id },
    }),
  );

  if (deleteError) {
    return handleError(deleteError, "Failed to delete tracked path:");
  }

  return NextResponse.json({ success: true });
}
