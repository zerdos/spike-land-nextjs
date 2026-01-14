import {
  CODESPACE_TOOL_NAMES,
  createCodespaceServer,
} from "@/lib/claude-agent/tools/codespace-tools";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { NextResponse } from "next/server";

export const maxDuration = 120;

/**
 * Debug endpoint to test agent tool execution
 * POST /api/test/agent-debug
 *
 * Body:
 * - codespaceId: string - The codespace to test against
 * - prompt: string - The prompt to send to the agent
 */
export async function POST(request: Request) {
  try {
    const { codespaceId, prompt } = await request.json();

    if (!codespaceId || !prompt) {
      return NextResponse.json(
        { error: "Missing codespaceId or prompt" },
        { status: 400 },
      );
    }

    console.log("[test/agent-debug] Starting test");
    console.log("[test/agent-debug] codespaceId:", codespaceId);
    console.log("[test/agent-debug] prompt:", prompt);

    // Create MCP server
    const server = createCodespaceServer(codespaceId);
    console.log("[test/agent-debug] MCP server created");
    console.log("[test/agent-debug] Allowed tools:", CODESPACE_TOOL_NAMES);

    // Fetch current code first
    const beforeResponse = await fetch(
      `https://testing.spike.land/live/${codespaceId}/session.json`,
    );
    const beforeData = beforeResponse.ok ? await beforeResponse.json() : null;
    const codeBefore = beforeData?.code || "";
    console.log("[test/agent-debug] Code before length:", codeBefore.length);

    // Run the agent
    const result = query({
      prompt,
      options: {
        mcpServers: { codespace: server },
        allowedTools: CODESPACE_TOOL_NAMES,
        tools: [],
        permissionMode: "dontAsk",
        persistSession: false,
        systemPrompt:
          "You are a coding assistant. ALWAYS use tools to make changes. Use read_code, update_code, or search_and_replace to modify code.",
      },
    });

    const messages = [];
    let finalText = "";

    for await (const message of result) {
      console.log(
        "[test/agent-debug] Message:",
        JSON.stringify(message, null, 2),
      );
      messages.push(message);

      // Extract text from assistant messages
      if (message.type === "assistant") {
        const betaMessage = (message as {
          message?: {
            content?: Array<{ type: string; text?: string; name?: string; }>;
          };
        }).message;
        const contentArray = betaMessage?.content || [];
        const textParts = contentArray.filter((c) => c.type === "text");
        finalText += textParts.map((c) => c.text || "").join("");
      }
    }

    // Fetch code after
    const afterResponse = await fetch(
      `https://testing.spike.land/live/${codespaceId}/session.json`,
    );
    const afterData = afterResponse.ok ? await afterResponse.json() : null;
    const codeAfter = afterData?.code || "";
    console.log("[test/agent-debug] Code after length:", codeAfter.length);

    const codeChanged = codeBefore !== codeAfter;
    console.log("[test/agent-debug] Code changed:", codeChanged);

    return NextResponse.json({
      success: true,
      codeChanged,
      codeBefore: codeBefore.substring(0, 500) + (codeBefore.length > 500 ? "..." : ""),
      codeAfter: codeAfter.substring(0, 500) + (codeAfter.length > 500 ? "..." : ""),
      agentResponse: finalText,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("[test/agent-debug] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to directly test updating code
 * GET /api/test/agent-debug?codespaceId=xxx&code=xxx
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const codespaceId = url.searchParams.get("codespaceId");
  const code = url.searchParams.get("code");

  if (!codespaceId) {
    return NextResponse.json(
      { error: "Missing codespaceId" },
      { status: 400 },
    );
  }

  // If code provided, update it
  if (code) {
    console.log("[test/agent-debug] Direct code update to:", codespaceId);
    const response = await fetch(
      `https://testing.spike.land/live/${codespaceId}/api/code`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, run: true }),
      },
    );

    const data = await response.json();
    return NextResponse.json({
      updateResponse: data,
      status: response.status,
    });
  }

  // Otherwise just read the current code
  const response = await fetch(
    `https://testing.spike.land/live/${codespaceId}/session.json`,
  );
  const data = await response.json();

  return NextResponse.json({
    codespaceId,
    codeLength: data.code?.length || 0,
    code: data.code?.substring(0, 1000) || "",
  });
}
