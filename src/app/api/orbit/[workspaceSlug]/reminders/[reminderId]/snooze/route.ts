import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; reminderId: string; }; },
) {
  try {
    const body = await request.json();
    const { hours } = body;

    const reminder = await prisma.connectionReminder.findUnique({
      where: { id: params.reminderId },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);

    const updatedReminder = await prisma.connectionReminder.update({
      where: { id: params.reminderId },
      data: {
        status: "SNOOZED",
        snoozedUntil: snoozeUntil,
        dueDate: snoozeUntil, // Update due date to snooze time
        snoozeCount: { increment: 1 },
      },
    });

    return NextResponse.json(updatedReminder);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
