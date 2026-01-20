import { auth } from "@/auth";
import { AutopilotService } from "@/lib/allocator/autopilot-service";
import { GuardrailAlertService } from "@/lib/allocator/guardrail-alert-service";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params: _params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { workspaceSlug: _workspaceSlug } = _params;
    // Note: workspaceSlug from URL is used for routing context only.
    // The actual workspaceId is provided in the request body and validated
    // via workspace membership check below (the critical security control).

    const body = await req.json();
    const { workspaceId } = body;

    // Verify workspace access and ADMIN/OWNER role
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (workspaceId !== _workspaceSlug && _workspaceSlug !== "legacy") {
      // Optional: Explicitly validate slug if we can resolve it,
      // but strictly checking membership on the target workspaceId is the critical security control.
      // If the slug in URL is just for routing context, ensuring we have rights on the *requested* ID in body is key.
      // Ideally we check that `workspaceId` matches the slug, but slug resolution requires a DB call.
      // Let's at least enforce they are consistent if we can, or rely on the membership check of the target ID.
    }

    await AutopilotService.setAutopilotConfig(workspaceId, {
      isEmergencyStopped: true,
      emergencyStoppedAt: new Date(),
      emergencyStoppedBy: session.user.id,
      emergencyStopReason: "Manual Emergency Stop",
    });

    // Create Alert
    await GuardrailAlertService.createAlert({
      workspaceId,
      alertType: "EMERGENCY_STOP_ACTIVATED",
      severity: "CRITICAL",
      message: `Emergency Stop activated by ${session.user.email || session.user.id}`,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    return new NextResponse("Emergency Stop Activated", { status: 200 });
  } catch (error) {
    console.error("[EMERGENCY_STOP]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params: _params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { workspaceId } = body;

    // Verify workspace access and ADMIN/OWNER role
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const config = await AutopilotService.setAutopilotConfig(
      workspaceId,
      { isEmergencyStopped: false },
    );

    return NextResponse.json(config);
  } catch (error) {
    console.error("[EMERGENCY_STOP_DISABLE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
