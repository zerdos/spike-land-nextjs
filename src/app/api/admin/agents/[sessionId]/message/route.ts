/**
 * Admin Agent Session Message API
 *
 * POST - Send a message to the agent
 */

import { auth } from "@/auth";
import { isJulesAvailable, sendMessage } from "@/lib/agents/jules-client";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ sessionId: string; }>;
}

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
});

/**
 * POST /api/admin/agents/[sessionId]/message
 * Send a message to the agent session
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

  // Parse request body
  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = messageSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { message } = parseResult.data;

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

  // Send message via Jules API
  const { data: julesSession, error: julesError } = await sendMessage(
    dbSession.externalId,
    message,
  );

  if (julesError) {
    console.error("Failed to send message:", julesError);
    return NextResponse.json(
      { error: julesError },
      { status: 502 },
    );
  }

  // Record activity
  const { data: activity } = await tryCatch(
    prisma.agentSessionActivity.create({
      data: {
        sessionId,
        type: "user_message",
        content: message,
        metadata: {
          sentBy: session.user.id,
          julesState: julesSession?.state,
        },
      },
    }),
  );

  // Update session with latest activity
  await tryCatch(
    prisma.externalAgentSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
      },
    }),
  );

  return NextResponse.json({
    success: true,
    activity: activity
      ? {
        id: activity.id,
        type: activity.type,
        content: activity.content,
        createdAt: activity.createdAt.toISOString(),
      }
      : null,
  });
}
