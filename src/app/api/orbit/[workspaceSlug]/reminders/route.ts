import prisma from "@/lib/prisma";
import { type ReminderType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const reminders = await prisma.connectionReminder.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: "COMPLETED" }, // Default to active reminders
      },
      include: {
        connection: {
          select: { displayName: true },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json(reminders);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, type, dueDate, connectionId } = body;

    const reminder = await prisma.connectionReminder.create({
      data: {
        workspaceId: workspace.id,
        title,
        description,
        type: type as ReminderType,
        dueDate: new Date(dueDate),
        connectionId,
      },
    });

    return NextResponse.json(reminder);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
