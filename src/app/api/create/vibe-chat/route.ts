import { auth } from "@/auth";
import { isClaudeConfigured } from "@/lib/ai/claude-client";
import { resolveAIProviderConfig } from "@/lib/ai/ai-config-resolver";
import { getSystemPromptWithCode } from "@/lib/claude-agent/prompts/codespace-system";
import {
  EDIT_MODE_PREAMBLE,
  PLAN_ALLOWED_TOOLS,
  PLAN_MODE_PREAMBLE,
} from "@/lib/claude-agent/prompts/vibe-code-system";
import {
  CODESPACE_TOOL_NAMES,
  createCodespaceServer,
} from "@/lib/claude-agent/tools/codespace-tools";
import { getOrCreateSession } from "@/lib/codespace";
import { getCreatedApp } from "@/lib/create/content-service";
import logger from "@/lib/logger";
import { tryCatch } from "@/lib/try-catch";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes

// Simple in-memory rate limiter (IP-based, 10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Content part type for SDK messages
interface ContentPart {
  type: "text" | "tool_use";
  text?: string;
  name?: string;
}

function emitSSE(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Parse body
  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, content, mode, images, screenshotBase64 } = body;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (!mode || !["plan", "edit"].includes(mode)) {
    return NextResponse.json({ error: "Mode must be 'plan' or 'edit'" }, { status: 400 });
  }

  // Auth check for edit mode
  if (mode === "edit") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required for edit mode" }, { status: 401 });
    }
  }

  // Look up the app
  const app = await getCreatedApp(slug);
  if (!app || app.status !== "PUBLISHED" || !app.codespaceId) {
    return NextResponse.json({ error: "App not found or not published" }, { status: 404 });
  }

  // Check if AI agent is configured
  const configured = await isClaudeConfigured();
  if (!configured) {
    return NextResponse.json(
      { error: "AI agent not configured for this environment" },
      { status: 503 },
    );
  }

  // Resolve OAuth token to pass to Agent SDK subprocess.
  // Only CLAUDE_CODE_OAUTH_TOKEN is used (Claude Max subscription provides
  // cost-effective Opus 4.6 access vs raw API keys).
  const aiConfig = await resolveAIProviderConfig("anthropic");
  const oauthToken =
    aiConfig?.token ??
    process.env["CLAUDE_CODE_OAUTH_TOKEN"];

  // Fetch current code
  const { data: codespaceSession } = await tryCatch(getOrCreateSession(app.codespaceId));
  const currentCode = codespaceSession?.code || "";

  // Create MCP server
  const codespaceServer = createCodespaceServer(app.codespaceId);

  // Determine allowed tools based on mode
  const allowedTools = mode === "plan" ? PLAN_ALLOWED_TOOLS : CODESPACE_TOOL_NAMES;

  // Build system prompt with mode preamble
  const modePreamble = mode === "plan" ? PLAN_MODE_PREAMBLE : EDIT_MODE_PREAMBLE;
  const systemPrompt = `${modePreamble}\n\n${currentCode ? getSystemPromptWithCode(currentCode) : ""}`;

  // Build user message content blocks (text + optional images)
  const userContent: Array<{ type: string; [key: string]: unknown }> = [
    { type: "text", text: content },
  ];

  // Add images if provided
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string" && img.startsWith("data:")) {
        const match = img.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          userContent.push({
            type: "image",
            source: { type: "base64", media_type: match[1], data: match[2] },
          });
        }
      }
    }
  }

  // Add screenshot if provided
  if (screenshotBase64 && typeof screenshotBase64 === "string") {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: screenshotBase64 },
    });
  }

  // Stream response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        emitSSE(controller, { type: "stage", stage: "initialize" });

        // Build the prompt: use multi-modal SDKUserMessage when images are present
        const hasImages = userContent.length > 1;
        const promptInput = hasImages
          ? (async function* () {
              yield {
                type: "user" as const,
                message: {
                  role: "user" as const,
                  content: userContent as unknown as MessageParam["content"],
                },
                parent_tool_use_id: null,
                session_id: "",
              };
            })()
          : content;

        emitSSE(controller, { type: "stage", stage: "connecting" });

        const result = query({
          prompt: promptInput,
          options: {
            mcpServers: { codespace: codespaceServer },
            allowedTools,
            tools: [],
            permissionMode: "dontAsk",
            persistSession: false,
            systemPrompt,
            env: {
              ...process.env,
              ...(oauthToken ? { CLAUDE_CODE_OAUTH_TOKEN: oauthToken } : {}),
            },
          },
        });

        for await (const message of result) {
          if (message.type === "assistant") {
            const assistantMessage = message as { message?: { content?: ContentPart[] } };
            const contentArray = assistantMessage.message?.content || [];

            const textParts = contentArray.filter((c) => c.type === "text");
            const text = textParts.map((c) => c.text || "").join("");
            if (text) {
              emitSSE(controller, { type: "chunk", content: text });
            }

            const toolUseParts = contentArray.filter((c) => c.type === "tool_use");
            for (const toolUse of toolUseParts) {
              emitSSE(controller, { type: "stage", stage: "executing_tool", tool: toolUse.name });
            }
          }

          if (message.type === "result") {
            if (message.subtype !== "success") {
              const resultMsg = message as { errors?: string[] };
              emitSSE(controller, { type: "error", content: resultMsg.errors?.join(", ") || "Unknown error" });
            }
          }
        }

        // Check if code was updated (for edit mode)
        if (mode === "edit") {
          const { data: verifySession } = await tryCatch(getOrCreateSession(app.codespaceId!));
          if (verifySession && verifySession.code !== currentCode) {
            emitSSE(controller, { type: "code_updated" });
          }
        }

        emitSSE(controller, { type: "complete" });
        controller.close();
      } catch (error) {
        logger.error("[vibe-chat] Streaming error:", { error });
        emitSSE(controller, { type: "error", content: error instanceof Error ? error.message : "Unknown error" });
        emitSSE(controller, { type: "complete" });
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
