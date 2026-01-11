import { auth } from "@/auth";
import { AutopilotService } from "@/lib/allocator/autopilot-service";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { workspaceSlug: string; executionId: string; }; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceSlug, executionId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json({ error: "Access denied: Admin privileges required" }, {
      status: 403,
    });
  }

  const { data: result, error } = await tryCatch(
    AutopilotService.rollbackExecution(executionId, session.user.id),
  );

  if (error) {
    console.error("Error rolling back execution:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ result });
}
