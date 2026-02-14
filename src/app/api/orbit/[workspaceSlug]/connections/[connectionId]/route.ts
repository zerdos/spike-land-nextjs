import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for validating allowed update fields
// Note: nextStep must match Prisma enum - for simplicity we skip it for now
const ConnectionUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  notes: z.string().max(5000).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ workspaceSlug: string; connectionId: string; }>;
}

/**
 * Verify authentication and workspace membership.
 * Returns the session user ID and workspace ID, or a NextResponse error.
 */
async function verifyWorkspaceAccess(
  workspaceSlug: string,
): Promise<{ userId: string; workspaceId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { userId: session.user.id } },
      },
      select: { id: true },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 403 },
    );
  }

  return { userId: session.user.id, workspaceId: workspace.id };
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug, connectionId } = await params;

  const access = await verifyWorkspaceAccess(workspaceSlug);
  if (access instanceof NextResponse) return access;

  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        platformPresence: true,
        reminders: {
          orderBy: { dueDate: "asc" },
        },
        meetupHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json(connection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug, connectionId } = await params;

  const access = await verifyWorkspaceAccess(workspaceSlug);
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json();

    // Validate input - only allowed fields
    const parseResult = ConnectionUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const connection = await prisma.connection.update({
      where: { id: connectionId },
      data: parseResult.data,
    });
    return NextResponse.json(connection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug, connectionId } = await params;

  const access = await verifyWorkspaceAccess(workspaceSlug);
  if (access instanceof NextResponse) return access;

  try {
    await prisma.connection.delete({
      where: { id: connectionId },
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
