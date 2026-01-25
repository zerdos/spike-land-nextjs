import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; reminderId: string; }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { reminderId } = await params;
  try {
    const updatedReminder = await prisma.connectionReminder.update({
      where: { id: reminderId },
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
