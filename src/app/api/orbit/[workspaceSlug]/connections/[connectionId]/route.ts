import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

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
    const connection = await prisma.connection.update({
      where: { id: params.connectionId },
      data: body,
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
