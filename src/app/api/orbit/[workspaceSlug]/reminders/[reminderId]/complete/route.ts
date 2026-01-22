import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; reminderId: string; }; },
) {
  try {
    const updatedReminder = await prisma.connectionReminder.update({
      where: { id: params.reminderId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updatedReminder);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
