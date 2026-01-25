import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; reminderId: string; }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { reminderId } = await params;
  try {
    const body = await request.json();
    const updatedReminder = await prisma.connectionReminder.update({
      where: { id: reminderId },
      data: body,
    });
    return NextResponse.json(updatedReminder);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { reminderId } = await params;
  try {
    await prisma.connectionReminder.delete({
      where: { id: reminderId },
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
