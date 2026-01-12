import { auth } from "@/auth";
import { GuardrailAlertService } from "@/lib/allocator/guardrail-alert-service";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params: _params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return new NextResponse("Workspace ID required", { status: 400 });
    }

    // Verify workspace access
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const alerts = await GuardrailAlertService.getActiveAlerts(workspaceId);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("[GET_ALERTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params: _params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { alertId } = body;

    // Verify alert ownership/workspace access via the alert itself or passed workspaceId
    // Since we only have alertId, we first fetch the alert to check workspace, then check membership
    const alert = await prisma.allocatorGuardrailAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return new NextResponse("Alert not found", { status: 404 });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: alert.workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updated = await GuardrailAlertService.acknowledgeAlert(alertId, session.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ACK_ALERT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
