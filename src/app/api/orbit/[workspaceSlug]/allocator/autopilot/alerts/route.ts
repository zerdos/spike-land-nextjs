import { auth } from "@/auth";
import { GuardrailAlertService } from "@/lib/allocator/guardrail-alert-service";
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

    const updated = await GuardrailAlertService.acknowledgeAlert(alertId, session.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ACK_ALERT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
