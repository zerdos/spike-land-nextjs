import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for task result update
const taskResultSchema = z.object({
  taskId: z.string(),
  status: z.enum(["COMPLETED", "FAILED", "PROCESSING"]),
  result: z.any().optional(),
  error: z.string().optional(),
});

// GET /api/v1/agent/tasks?boxId=...
// Fetch pending tasks for a specific box
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const boxId = searchParams.get("boxId");

  if (!boxId) {
    return NextResponse.json({ error: "Missing boxId" }, { status: 400 });
  }

  // TODO: Add Authorization header check here in Phase 2
  // verifyAgentToken(req);

  try {
    const tasks = await prisma.agentTask.findMany({
      where: {
        boxId,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to fetch agent tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

// POST /api/v1/agent/tasks
// Update task status key/result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status, result, error } = taskResultSchema.parse(body);

    const updatedTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status,
        result: result ?? undefined,
        error: error ?? undefined,
      },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Invalid request body",
        details: error.flatten(),
      }, {
        status: 400,
      });
    }
    console.error("Failed to update agent task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
