import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { EscalationService } from "@/lib/smart-routing/escalation-service";
import { EscalationRequestSchema } from "@/lib/validations/smart-routing";
import { EscalationTrigger } from "@prisma/client";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; itemId: string; }>;
}

export async function POST(
  request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug, itemId } = await params;
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:manage");

    const json = await request.json();
    const body = EscalationRequestSchema.parse(json);

    const service = new EscalationService(workspace.id);
    const updatedItem = await service.escalateItem(
      itemId,
      EscalationTrigger.MANUAL,
      body.reason,
      body.targetLevel,
      body.targetUserId,
    );

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    console.error("Escalation API Error:", error);
    const message = error instanceof Error
      ? error.message
      : "Failed to escalate item";
    const status = (error as { status?: number; })?.status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
