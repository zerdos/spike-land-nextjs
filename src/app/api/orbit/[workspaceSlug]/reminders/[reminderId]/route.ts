import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; reminderId: string; }; },
) {
  try {
    const body = await request.json();
    const updatedReminder = await prisma.connectionReminder.update({
      where: { id: params.reminderId },
      data: body,
    });
    return NextResponse.json(updatedReminder);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; reminderId: string; }; },
) {
  try {
    await prisma.connectionReminder.delete({
      where: { id: params.reminderId },
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
