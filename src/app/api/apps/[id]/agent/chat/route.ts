import { broadcastCodeUpdated } from "@/app/api/apps/[id]/messages/stream/route";
import { auth } from "@/auth";
import {
  CODESPACE_SYSTEM_PROMPT,
  getSystemPromptWithCode,
} from "@/lib/claude-agent/prompts/codespace-system";
import {
  CODESPACE_TOOL_NAMES,
  createCodespaceServer,
} from "@/lib/claude-agent/tools/codespace-tools";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300; // 5 minutes

// Timeout for external fetches (5 seconds)
const FETCH_TIMEOUT_MS = 5000;

// Helper to emit stage events to stream
function emitStage(
  controller: ReadableStreamDefaultController,
  stage: string,
  tool?: string,
) {
  const data = JSON.stringify({
    type: "stage",
    stage,
    ...(tool && { tool }),
  });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

// Custom error for fetch timeouts
class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Fetch to ${url} timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: abortController.signal,
    });
    return response;
  } catch (error) {
    // Distinguish timeout from other errors
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = params;

  // Verify user owns this app
  const { data: app, error: appError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        codespaceId: true,
        codespaceUrl: true,
        status: true,
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

  if (!app.codespaceId) {
    return NextResponse.json(
      { error: "App does not have a codespace configured" },
      { status: 400 },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content } = body;
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  // Create user message in DB
  await tryCatch(
    prisma.appMessage.create({
      data: {
        appId: id,
        role: "USER",
        content,
      },
    }),
  );

  // Create MCP server with codespace tools
  const codespaceServer = createCodespaceServer(app.codespaceId);

  // Fetch current code from testing.spike.land to include in context
  // Using timeout to prevent hangs
  let currentCode = "";
  const { data: sessionResponse, error: sessionError } = await tryCatch(
    fetchWithTimeout(
      `https://testing.spike.land/live/${app.codespaceId}/session.json`,
      { headers: { "Accept": "application/json" } },
    ),
  );

  if (!sessionError && sessionResponse.ok) {
    const { data: sessionData } = await tryCatch(sessionResponse.json());
    if (sessionData?.code) {
      currentCode = sessionData.code;
    }
  }

  console.log(
    "[agent/chat] Starting agent query for app:",
    id,
    "codespace:",
    app.codespaceId,
    "code length:",
    currentCode.length,
  );

  // Build system prompt with current code
  const systemPrompt = currentCode
    ? getSystemPromptWithCode(currentCode)
    : CODESPACE_SYSTEM_PROMPT;

  // Stream using Claude Agent SDK
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit connecting stage immediately
        emitStage(controller, "connecting");

        // Note: "processing" stage will be emitted when first message arrives
        // to avoid UI flicker from back-to-back stage emissions

        const result = query({
          prompt: content,
          options: {
            mcpServers: {
              codespace: codespaceServer,
            },
            allowedTools: CODESPACE_TOOL_NAMES,
            tools: [], // Disable built-in tools (Read, Write, Bash)
            permissionMode: "dontAsk", // Critical: Don't prompt, deny non-allowed tools
            persistSession: false, // No session persistence in server context
            systemPrompt,
          },
        });

        let finalResponse = "";
        let codeUpdated = false; // Track if any code-modifying tools were used
        let processingEmitted = false; // Track if processing stage was emitted

        for await (const message of result) {
          // Emit processing stage on first message to avoid UI flicker
          if (!processingEmitted) {
            emitStage(controller, "processing");
            processingEmitted = true;
          }
          console.log("[agent/chat] Message type:", message.type);

          // Handle assistant text messages
          // SDKAssistantMessage has message.message.content (BetaMessage structure)
          if (message.type === "assistant") {
            const betaMessage = (message as {
              message?: {
                content?: Array<{ type: string; text?: string; name?: string; }>;
              };
            }).message;
            const contentArray = betaMessage?.content || [];

            // Extract text parts
            const textParts = contentArray.filter((c) => c.type === "text");
            const text = textParts.map((c) => c.text || "").join("");
            if (text) {
              finalResponse += text;
              const data = JSON.stringify({ type: "chunk", content: text });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            // Notify about tool use and track code-modifying tools
            const toolUseParts = contentArray.filter((c) => c.type === "tool_use");
            for (const toolUse of toolUseParts) {
              const toolName = toolUse.name || "";
              // Track if any code-modifying tools are used
              if (
                toolName.includes("update_code") ||
                toolName.includes("edit_code") ||
                toolName.includes("search_and_replace")
              ) {
                codeUpdated = true;
              }
              // Emit executing_tool stage with tool name
              emitStage(controller, "executing_tool", toolName || "tool");
              const statusData = JSON.stringify({
                type: "status",
                content: `Executing ${toolName || "tool"}...`,
              });
              controller.enqueue(
                new TextEncoder().encode(`data: ${statusData}\n\n`),
              );
            }
          }

          // Handle result messages
          if (message.type === "result") {
            console.log("[agent/chat] Query completed:", message.subtype);
            // Check for any error subtype
            if (message.subtype !== "success") {
              const resultMsg = message as { errors?: string[]; };
              const errData = JSON.stringify({
                type: "error",
                content: resultMsg.errors?.join(", ") || "Unknown error",
              });
              controller.enqueue(
                new TextEncoder().encode(`data: ${errData}\n\n`),
              );
            }
          }
        }

        // Save agent response to DB and capture the message ID for code version linking
        let agentMessageId: string | undefined;
        if (finalResponse) {
          const agentMessageResult = await tryCatch(
            prisma.appMessage.create({
              data: {
                appId: id,
                role: "AGENT",
                content: finalResponse,
              },
            }),
          );
          if (agentMessageResult.data) {
            agentMessageId = agentMessageResult.data.id;
          }

          // Attempt to extract name and description if this is one of the first interactions
          // We check if the name looks like a slug (contains dashes and potentially matches the patterns)
          const isDefaultName = app.codespaceId &&
            app.codespaceId.includes("-");

          if (isDefaultName) {
            // Fire and forget - don't block the stream
            // This runs in the background to improve cold response time
            generateAppDetails(id, finalResponse, content).catch((e) => {
              console.error("[agent/chat] Background generateAppDetails failed:", e);
            });
          }
        }

        // Broadcast code update to SSE clients if any code-modifying tools were used
        if (codeUpdated) {
          console.log(
            "[agent/chat] Code was updated, broadcasting to SSE clients",
          );

          // Emit validating stage
          emitStage(controller, "validating");

          // Verify the update actually happened (with timeout)
          const { data: verifyResponse } = await tryCatch(
            fetchWithTimeout(
              `https://testing.spike.land/live/${app.codespaceId}/session.json`,
              { headers: { "Accept": "application/json" } },
            ),
          );

          if (verifyResponse?.ok) {
            const { data: verifyData } = await tryCatch(verifyResponse.json());
            const actuallyChanged = verifyData?.code !== currentCode;
            console.log(
              `[agent/chat] Code verification: ${actuallyChanged ? "SUCCESS" : "FAILED"}`,
            );

            if (!actuallyChanged) {
              console.error(
                "[agent/chat] Tool claimed success but code unchanged!",
              );
            }

            // Create code version snapshot if code was actually updated
            if (actuallyChanged && verifyData?.code) {
              const crypto = await import("crypto");
              const hash = crypto.createHash("sha256")
                .update(verifyData.code)
                .digest("hex");

              // Use the captured agentMessageId directly (no query needed)
              await prisma.appCodeVersion.create({
                data: {
                  appId: id,
                  messageId: agentMessageId,
                  code: verifyData.code,
                  hash,
                },
              });
              console.log("[agent/chat] Created code version snapshot");
            }
          }

          broadcastCodeUpdated(id);
        }

        // Emit complete stage
        emitStage(controller, "complete");

        controller.close();
      } catch (error) {
        console.error("[agent/chat] Streaming error:", error);
        // Emit error stage
        emitStage(controller, "error");
        const errData = JSON.stringify({
          type: "error",
          content: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(new TextEncoder().encode(`data: ${errData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// Helper to generate app name and description
async function generateAppDetails(
  appId: string,
  agentResponse: string,
  userPrompt: string,
) {
  const startTime = Date.now();
  const logContext = { appId, operation: "generateAppDetails" };

  try {
    const namingPrompt = `
      Based on the following conversation, generate a short, creative name (max 3-4 words) and a brief description (max 20 words) for the application being built.
      
      User: "${userPrompt.substring(0, 500)}..."
      Agent: "${agentResponse.substring(0, 500)}..."
      
      Return ONLY a JSON object with keys "name" and "description". Do not include markdown formatting.
    `;

    const result = await query({
      prompt: namingPrompt,
      options: {
        // No tools for this, just pure LLM
        systemPrompt:
          "You are a helpful assistant that generates names and descriptions for software applications.",
      },
    });

    let jsonStr = "";
    for await (const message of result) {
      if (message.type === "assistant") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const betaMessage = (message as any).message;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = betaMessage?.content?.filter((c: any) => c.type === "text" // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).map((c: any) => c.text).join("") || "";
        jsonStr += text;
      }
    }

    // Clean up JSON string (remove markdown code blocks if present)
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

    // Validate the parsed JSON with Zod schema
    const appDetailsSchema = z.object({
      name: z.string().min(1).max(50),
      description: z.string().min(1).max(200),
    });

    const parsed = appDetailsSchema.safeParse(JSON.parse(jsonStr));

    if (parsed.success) {
      await prisma.app.update({
        where: { id: appId },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
        },
      });
      const durationMs = Date.now() - startTime;
      console.log("[agent/chat] generateAppDetails success", {
        ...logContext,
        durationMs,
        status: "success",
        name: parsed.data.name,
      });
    } else {
      const durationMs = Date.now() - startTime;
      console.warn("[agent/chat] generateAppDetails validation failed", {
        ...logContext,
        durationMs,
        status: "validation_failed",
        error: parsed.error.message,
      });
    }
  } catch (e) {
    const durationMs = Date.now() - startTime;
    console.error("[agent/chat] generateAppDetails error", {
      ...logContext,
      durationMs,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
