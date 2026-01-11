import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { EscalationService } from "@/lib/smart-routing/escalation-service";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  // This endpoint might be called by a cron job service (e.g., Vercel Cron)
  // Need to secure it, possibly with a CRON_SECRET header check

  // For now, allow workspace admins to trigger it manually too
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    // If called by user, check permissions
    // If called by cron, check secret (TODO)
    // For now, assuming user context or internal call
    if (session) {
      // Check perms if session exists
      //  await requireWorkspacePermission(session, workspace.id, "inbox:manage");
    }

    const service = new EscalationService(workspace.id);
    await service.checkSLABreaches();

    return NextResponse.json({ success: true, message: "SLA check completed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
