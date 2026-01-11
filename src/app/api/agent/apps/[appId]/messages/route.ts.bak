import { verifyAgentAuth } from "@/lib/auth/agent";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/agent/apps/[appId]/messages
 * Get unread messages for an app (for agent processing)
 * Requires agent API key authentication
 */
export async function GET(
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

  // Verify app exists and is not archived
  const { data: app, error: appError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id: appId,
        status: { notIn: ["ARCHIVED"] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        codespaceId: true,
        codespaceUrl: true,
        description: true,
      },
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

  // Get all unread messages (from users, not from agent)
  const { data: messages, error: messagesError } = await tryCatch(
    prisma.appMessage.findMany({
      where: {
        appId,
        isRead: false,
        role: "USER",
      },
      include: {
        attachments: {
          include: {
            image: {
              select: {
                id: true,
                originalUrl: true,
                width: true,
                height: true,
                format: true,
                tags: true,
                aiDescription: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" }, // Oldest first
    }),
  );

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    app,
    messages,
    unreadCount: messages.length,
  });
}

/**
 * POST /api/agent/apps/[appId]/messages
 * Mark messages as read
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

  const { messageIds } = body as { messageIds?: string[]; };

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json(
      { error: "messageIds array required" },
      { status: 400 },
    );
  }

  // Mark messages as read
  const { data: result, error: updateError } = await tryCatch(
    prisma.appMessage.updateMany({
      where: {
        id: { in: messageIds },
        appId,
      },
      data: { isRead: true },
    }),
  );

  if (updateError) {
    console.error("Error marking messages as read:", updateError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    marked: result.count,
  });
}
