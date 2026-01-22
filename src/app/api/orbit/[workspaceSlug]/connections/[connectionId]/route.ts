import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for validating allowed update fields
// Note: nextStep must match Prisma enum - for simplicity we skip it for now
const ConnectionUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  notes: z.string().max(5000).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

// TODO: Add auth checks - tracked as follow-up issue
// TODO: Validate workspace access - tracked as follow-up issue

export async function GET(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: params.connectionId },
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
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
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
      where: { id: params.connectionId },
      data: parseResult.data,
    });
    return NextResponse.json(connection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
  try {
    await prisma.connection.delete({
      where: { id: params.connectionId },
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
