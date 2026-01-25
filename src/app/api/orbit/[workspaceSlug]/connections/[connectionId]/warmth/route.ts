import { calculateWarmth } from "@/lib/connections/warmth-calculator";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; connectionId: string; }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { connectionId } = await params;
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Calculate new warmth score
    // Note: This relies on the warmth-calculator lib which we will implement next
    const warmthScore = await calculateWarmth(connectionId);

    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        warmthScore,
      },
    });

    return NextResponse.json(updatedConnection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
