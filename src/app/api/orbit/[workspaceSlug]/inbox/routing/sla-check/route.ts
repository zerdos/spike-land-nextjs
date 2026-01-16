import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { EscalationService } from "@/lib/smart-routing/escalation-service";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  const session = await auth();
  const cronSecret = request.headers.get("x-cron-secret");
  const isValidCronCall = cronSecret === process.env.CRON_SECRET &&
    process.env.CRON_SECRET;

  // Require either valid session or valid cron secret
  if (!session && !isValidCronCall) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    // If called by user, verify permissions
    if (session) {
      await requireWorkspacePermission(session, workspace.id, "inbox:manage");
    }

    const service = new EscalationService(workspace.id);
    await service.checkSLABreaches();

    return NextResponse.json({ success: true, message: "SLA check completed" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
