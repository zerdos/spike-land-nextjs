import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const heartbeatSchema = z.object({
  boxId: z.string(),
  status: z.string().optional(), // e.g. "IDLE", "BUSY"
  load: z.number().optional(), // CPU load or similar metric
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { boxId, status, load } = heartbeatSchema.parse(body);

    // Verify box exists
    const box = await prisma.box.findUnique({
      where: { id: boxId },
    });

    if (!box) {
      return NextResponse.json({ error: "Box not found" }, { status: 404 });
    }

    // Update box status if it was STOPPED/TERMINATED but is now reporting in?
    // Or just update metadata. For now, we trust the agent is RUNNING if it heartbeats.
    if (box.status !== "RUNNING") {
      await prisma.box.update({
        where: { id: boxId },
        data: { status: "RUNNING" },
      });
    }

    // In a real system, we'd store the heartbeat/load metric in a time-series DB or separate table.
    // For Phase 1, we just acknowledge.

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, {
        status: 400,
      });
    }
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
