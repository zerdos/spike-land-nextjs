import { createHash } from "crypto";

import { broadcastCodeUpdated, broadcastMessage } from "@/app/api/apps/[id]/messages/stream/route";
import { verifyAgentAuth } from "@/lib/auth/agent";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { dequeueMessage } from "@/lib/upstash";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for agent response
const agentResponseSchema = z.object({
  content: z.string().min(1).max(50000), // Agent responses can be longer
  codeUpdated: z.boolean().optional().default(false), // Flag if code was updated
  processedMessageIds: z.array(z.string()).optional(), // Messages this responds to
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional metadata (tool calls, etc.)
});

/**
 * POST /api/agent/apps/[appId]/respond
 * Post an agent response to the chat
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

  const parseResult = agentResponseSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { content, codeUpdated, processedMessageIds, metadata } = parseResult.data;

  // Verify app exists and is not archived
  const { data: app, error: appError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id: appId,
        status: { notIn: ["ARCHIVED"] },
      },
      select: { id: true, codespaceId: true },
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

  // Create agent message and mark processed messages as read
  const { data: result, error: createError } = await tryCatch(
    prisma.$transaction(async (tx) => {
      // Create the agent message
      const message = await tx.appMessage.create({
        data: {
          appId,
          role: "AGENT",
          content,
          isRead: false, // User hasn't read yet
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });

      // Mark processed messages as read
      if (processedMessageIds && processedMessageIds.length > 0) {
        await tx.appMessage.updateMany({
          where: {
            id: { in: processedMessageIds },
            appId,
          },
          data: { isRead: true },
        });
      }

      // Update app's last agent activity
      await tx.app.update({
        where: { id: appId },
        data: { lastAgentActivity: new Date() },
      });

      // If code was updated and app has a codespace, create a code version
      if (codeUpdated && app.codespaceId) {
        try {
          const sessionUrl = `https://testing.spike.land/live/${app.codespaceId}/session.json`;
          const response = await fetch(sessionUrl, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const sessionData = await response.json();
            const code = sessionData?.code || sessionData?.cSess?.code;

            if (code) {
              const hash = createHash("sha256").update(code).digest("hex");
              await tx.appCodeVersion.create({
                data: {
                  appId,
                  messageId: message.id,
                  code,
                  hash,
                },
              });
              console.log("[respond] Created code version for message:", message.id);
            }
          }
        } catch (codeVersionError) {
          // Log but don't fail - code version is nice-to-have for UI previews
          console.warn(
            "[respond] Failed to create code version:",
            codeVersionError instanceof Error ? codeVersionError.message : codeVersionError,
          );
        }
      }

      return message;
    }),
  );

  if (createError || !result) {
    console.error("Error creating agent response:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Dequeue processed messages from Redis
  if (processedMessageIds && processedMessageIds.length > 0) {
    for (const _msgId of processedMessageIds) {
      await tryCatch(dequeueMessage(appId));
    }
  }

  // Broadcast the new message to connected clients
  broadcastMessage(appId, {
    id: result.id,
    role: result.role,
    content: result.content,
    createdAt: result.createdAt,
  });

  // If code was updated, broadcast code update event (triggers iframe reload)
  if (codeUpdated) {
    broadcastCodeUpdated(appId);
  }

  return NextResponse.json(result, { status: 201 });
}
