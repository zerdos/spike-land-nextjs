/**
 * Admin Agent Session API
 *
 * GET - Get session details
 */

import { auth } from "@/auth";
import { getSession as getJulesSession, listActivities } from "@/lib/agents/jules-client";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ sessionId: string; }>;
}

/**
 * GET /api/admin/agents/[sessionId]
 * Get session details with activities
 */
export async function GET(_request: NextRequest, props: RouteParams) {
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

  const params = await props.params;
  const { sessionId } = params;

  // Fetch from database
  const { data: dbSession, error: dbError } = await tryCatch(
    prisma.externalAgentSession.findUnique({
      where: { id: sessionId },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    }),
  );

  if (dbError) {
    console.error("Failed to fetch session:", dbError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Optionally sync with Jules API for fresh data
  let julesData = null;
  let julesActivities = null;

  if (dbSession.provider === "JULES" && dbSession.externalId) {
    const [sessionResult, activitiesResult] = await Promise.all([
      getJulesSession(dbSession.externalId),
      listActivities(dbSession.externalId, 50),
    ]);

    if (sessionResult.data) {
      julesData = sessionResult.data;
    }
    if (activitiesResult.data) {
      julesActivities = activitiesResult.data.activities;
    }
  }

  return NextResponse.json({
    session: dbSession,
    julesData,
    julesActivities,
    timestamp: new Date().toISOString(),
  });
}
