import prisma from "@/lib/prisma";
import type { MeetupPipelineStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; connectionId: string; }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { connectionId } = await params;
  try {
    const body = await request.json();
    const { status, notes } = body;

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        meetupStatus: status as MeetupPipelineStatus,
        meetupStatusUpdatedAt: new Date(),
      },
    });

    // Create history record
    await prisma.meetupStatusHistory.create({
      data: {
        connectionId,
        fromStatus: connection.meetupStatus,
        toStatus: status as MeetupPipelineStatus,
        notes,
      },
    });

    return NextResponse.json(updatedConnection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
