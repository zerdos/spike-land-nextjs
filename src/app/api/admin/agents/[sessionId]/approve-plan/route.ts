/**
 * Admin Agent Session Approve Plan API
 *
 * POST - Approve the agent's plan
 */

import { auth } from "@/auth";
import { approvePlan, isJulesAvailable } from "@/lib/agents/jules-client";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { ExternalAgentStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ sessionId: string; }>;
}

/**
 * POST /api/admin/agents/[sessionId]/approve-plan
 * Approve the agent's implementation plan
 */
export async function POST(request: NextRequest, props: RouteParams) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isJulesAvailable()) {
    return NextResponse.json(
      { error: "Jules API is not configured" },
      { status: 503 },
    );
  }

  const params = await props.params;
  const { sessionId } = params;

  // Fetch session from database
  const { data: dbSession, error: dbError } = await tryCatch(
    prisma.externalAgentSession.findUnique({
      where: { id: sessionId },
    }),
  );

  if (dbError) {
    console.error("Failed to fetch session:", dbError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (dbSession.status !== ExternalAgentStatus.AWAITING_PLAN_APPROVAL) {
    return NextResponse.json(
      { error: "Session is not awaiting plan approval" },
      { status: 400 },
    );
  }

  // Approve plan via Jules API
  const { data: julesSession, error: julesError } = await approvePlan(
    dbSession.externalId,
  );

  if (julesError) {
    console.error("Failed to approve plan:", julesError);
    return NextResponse.json(
      { error: julesError },
      { status: 502 },
    );
  }

  // Update local database
  const { data: updatedSession, error: updateError } = await tryCatch(
    prisma.externalAgentSession.update({
      where: { id: sessionId },
      data: {
        status: (julesSession?.state as ExternalAgentStatus) || ExternalAgentStatus.IN_PROGRESS,
        planApprovedAt: new Date(),
      },
    }),
  );

  if (updateError) {
    console.error("Failed to update session in database:", updateError);
    // Plan was approved in Jules, but local update failed
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: julesSession?.state || "IN_PROGRESS",
        planApprovedAt: new Date().toISOString(),
      },
      warning: "Plan approved but local sync failed. Will sync on next fetch.",
    });
  }

  // Record activity
  await tryCatch(
    prisma.agentSessionActivity.create({
      data: {
        sessionId,
        type: "plan_approved",
        content: "Plan approved by admin",
        metadata: {
          approvedBy: session.user.id,
          julesState: julesSession?.state,
        },
      },
    }),
  );

  return NextResponse.json({
    success: true,
    session: {
      id: updatedSession.id,
      status: updatedSession.status,
      planApprovedAt: updatedSession.planApprovedAt?.toISOString(),
    },
  });
}
