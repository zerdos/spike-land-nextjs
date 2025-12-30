/**
 * Admin Agent Session Activities API
 *
 * GET - List activities for a session
 */

import { auth } from "@/auth";
import { listActivities as listJulesActivities } from "@/lib/agents/jules-client";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ sessionId: string; }>;
}

/**
 * GET /api/admin/agents/[sessionId]/activities
 * List activities for a session
 */
export async function GET(request: NextRequest, props: RouteParams) {
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

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  // Fetch session from database
  const { data: dbSession, error: dbError } = await tryCatch(
    prisma.externalAgentSession.findUnique({
      where: { id: sessionId },
    }),
  );

  if (dbError) {
    console.error("Failed to fetch session:", dbError);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch local activities
  const { data: localResult, error: localError } = await tryCatch(
    Promise.all([
      prisma.agentSessionActivity.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.agentSessionActivity.count({ where: { sessionId } }),
    ]),
  );

  if (localError) {
    console.error("Failed to fetch activities:", localError);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }

  const [localActivities, totalLocal] = localResult;

  // Optionally fetch from Jules API for fresh activities
  let julesActivities = null;
  if (dbSession.provider === "JULES" && dbSession.externalId) {
    const { data: julesData } = await listJulesActivities(
      dbSession.externalId,
      limit,
    );
    if (julesData) {
      julesActivities = julesData.activities;
    }
  }

  return NextResponse.json({
    activities: localActivities,
    julesActivities,
    pagination: {
      total: totalLocal,
      limit,
      offset,
      hasMore: offset + localActivities.length < totalLocal,
    },
    timestamp: new Date().toISOString(),
  });
}
