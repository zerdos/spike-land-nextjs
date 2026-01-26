/**
 * Sandbox Callback Endpoint
 *
 * Receives results from Vercel Sandbox after agent execution completes.
 * This endpoint:
 * 1. Validates the callback secret
 * 2. Updates the SandboxJob status
 * 3. Creates an agent message in the database
 * 4. Broadcasts updates via SSE to connected clients
 * 5. Clears the "agent working" status
 */

import { broadcastToApp } from "@/app/api/apps/[id]/messages/stream/route";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { setAgentWorking } from "@/lib/upstash/client";
import { timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Callback payload schema
const CallbackPayloadSchema = z.object({
  jobId: z.string(),
  appId: z.string(),
  messageId: z.string(),
  success: z.boolean(),
  response: z.string().optional(),
  error: z.string().optional(),
});

type CallbackPayload = z.infer<typeof CallbackPayloadSchema>;

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * POST /api/agent/sandbox/callback
 *
 * Called by Vercel Sandbox when agent execution completes
 */
export async function POST(request: NextRequest) {
  // Validate callback secret
  const callbackSecret = process.env["SANDBOX_CALLBACK_SECRET"];
  if (!callbackSecret) {
    console.error("[sandbox-callback] SANDBOX_CALLBACK_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const providedSecret = request.headers.get("X-Sandbox-Secret");
  if (!providedSecret || !secureCompare(providedSecret, callbackSecret)) {
    console.warn("[sandbox-callback] Invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate the request body
  const { data: body, error: parseError } = await tryCatch(request.json());
  if (parseError) {
    console.error("[sandbox-callback] Failed to parse body:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = CallbackPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    console.error(
      "[sandbox-callback] Invalid payload:",
      parseResult.error.message,
    );
    return NextResponse.json(
      { error: "Invalid payload", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const payload: CallbackPayload = parseResult.data;
  const { jobId, appId, messageId, success, response, error } = payload;

  console.log(
    "[sandbox-callback] Received callback for job:",
    jobId,
    "messageId:",
    messageId,
    "success:",
    success,
  );

  // Update the SandboxJob status
  const { error: updateError } = await tryCatch(
    prisma.sandboxJob.update({
      where: { id: jobId },
      data: {
        status: success ? "COMPLETED" : "FAILED",
        result: success && response ? { content: response } : undefined,
        error: error || undefined,
        completedAt: new Date(),
      },
    }),
  );

  if (updateError) {
    console.error("[sandbox-callback] Failed to update job:", updateError);
    // Continue anyway - we still want to create the message
  }

  // If successful, create the agent message
  if (success && response) {
    const { data: agentMessage, error: messageError } = await tryCatch(
      prisma.appMessage.create({
        data: {
          appId,
          role: "AGENT",
          content: response,
        },
      }),
    );

    if (messageError) {
      console.error(
        "[sandbox-callback] Failed to create agent message:",
        messageError,
      );
    } else {
      console.log(
        "[sandbox-callback] Created agent message:",
        agentMessage?.id,
      );

      // Broadcast the new message to connected SSE clients
      broadcastToApp(appId, {
        type: "message",
        data: {
          id: agentMessage?.id,
          role: "AGENT",
          content: response,
          createdAt: new Date().toISOString(),
        },
      });
    }
  } else if (!success) {
    // Broadcast error to clients
    broadcastToApp(appId, {
      type: "status",
      data: {
        error: true,
        message: error || "Agent execution failed",
      },
    });
  }

  // Clear the "agent working" status
  await setAgentWorking(appId, false);

  // Broadcast that agent is no longer working
  broadcastToApp(appId, {
    type: "agent_working",
    data: { isWorking: false },
  });

  console.log("[sandbox-callback] Callback processed successfully for:", jobId);

  return NextResponse.json({ success: true });
}
