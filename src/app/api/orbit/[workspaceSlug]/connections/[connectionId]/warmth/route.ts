import { calculateWarmth } from "@/lib/connections/warmth-calculator";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: params.connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Calculate new warmth score
    // Note: This relies on the warmth-calculator lib which we will implement next
    const warmthScore = await calculateWarmth(params.connectionId);

    const updatedConnection = await prisma.connection.update({
      where: { id: params.connectionId },
      data: {
        warmthScore,
      },
    });

    return NextResponse.json(updatedConnection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
