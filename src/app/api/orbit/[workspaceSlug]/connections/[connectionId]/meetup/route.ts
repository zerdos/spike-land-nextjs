import prisma from "@/lib/prisma";
import type { MeetupPipelineStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
  try {
    const body = await request.json();
    const { status, notes } = body;

    const connection = await prisma.connection.findUnique({
      where: { id: params.connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id: params.connectionId },
      data: {
        meetupStatus: status as MeetupPipelineStatus,
        meetupStatusUpdatedAt: new Date(),
      },
    });

    // Create history record
    await prisma.meetupStatusHistory.create({
      data: {
        connectionId: params.connectionId,
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
