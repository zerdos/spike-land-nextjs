import { broadcastAgentWorking, broadcastStatus } from "@/app/api/apps/[id]/messages/stream/route";
import { verifyAgentAuth } from "@/lib/auth/agent";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { setAgentWorking } from "@/lib/upstash";
import { appStatusUpdateSchema } from "@/lib/validations/app";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/agent/apps/[appId]/status
 * Update app status (agent can set any build status)
 * Requires agent API key authentication
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ appId: string; }>; },
) {
  if (!verifyAgentAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { appId } = params;

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Agent can also set isWorking flag
  const { isWorking, ...statusData } = body as {
    isWorking?: boolean;
    status?: string;
    message?: string;
  };

  // Handle isWorking flag separately
  if (typeof isWorking === "boolean") {
    await tryCatch(setAgentWorking(appId, isWorking));
    broadcastAgentWorking(appId, isWorking);
  }

  // If no status update, just return success for isWorking update
  if (!statusData.status) {
    return NextResponse.json({ success: true, isWorking });
  }

  // Validate status update
  const parseResult = appStatusUpdateSchema.safeParse(statusData);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { status, message } = parseResult.data;

  // Verify app exists
  const { data: app, error: appError } = await tryCatch(
    prisma.app.findFirst({
      where: { id: appId },
      select: { id: true, status: true },
    }),
  );

  if (appError) {
    console.error("Error fetching app:", appError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Update status
  const { data: updatedApp, error: updateError } = await tryCatch(
    prisma.$transaction([
      prisma.app.update({
        where: { id: appId },
        data: {
          status,
          lastAgentActivity: new Date(),
        },
        select: {
          id: true,
          status: true,
          lastAgentActivity: true,
        },
      }),
      prisma.appStatusHistory.create({
        data: {
          appId,
          status,
          message: message || `Agent changed status to ${status}`,
        },
      }),
    ]),
  );

  if (updateError) {
    console.error("Error updating app status:", updateError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Broadcast status change to connected clients
  broadcastStatus(
    appId,
    status,
    message || `Agent changed status to ${status}`,
  );

  return NextResponse.json(updatedApp[0]);
}
