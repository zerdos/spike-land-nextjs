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

export const maxDuration = 300; // 5 minutes

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
  let currentCode = "";
  const { data: sessionResponse, error: sessionError } = await tryCatch(
    fetch(`https://testing.spike.land/live/${app.codespaceId}/session.json`, {
      headers: { "Accept": "application/json" },
    }),
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
        const result = query({
          prompt: content,
          options: {
            mcpServers: {
              codespace: codespaceServer,
            },
            allowedTools: CODESPACE_TOOL_NAMES,
            systemPrompt,
          },
        });

        let finalResponse = "";

        for await (const message of result) {
          console.log("[agent/chat] Message type:", message.type);

          // Handle assistant text messages
          // SDKAssistantMessage has message.message.content (BetaMessage structure)
          if (message.type === "assistant") {
            const betaMessage = (message as {
              message?: { content?: Array<{ type: string; text?: string; name?: string; }>; };
            }).message;
            const contentArray = betaMessage?.content || [];

            // Extract text parts
            const textParts = contentArray.filter(c => c.type === "text");
            const text = textParts.map(c => c.text || "").join("");
            if (text) {
              finalResponse += text;
              const data = JSON.stringify({ type: "chunk", content: text });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            // Notify about tool use
            const toolUseParts = contentArray.filter(c => c.type === "tool_use");
            for (const toolUse of toolUseParts) {
              const statusData = JSON.stringify({
                type: "status",
                content: `Executing ${toolUse.name || "tool"}...`,
              });
              controller.enqueue(new TextEncoder().encode(`data: ${statusData}\n\n`));
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
              controller.enqueue(new TextEncoder().encode(`data: ${errData}\n\n`));
            }
          }
        }

        // Save agent response to DB
        if (finalResponse) {
          await tryCatch(
            prisma.appMessage.create({
              data: {
                appId: id,
                role: "AGENT",
                content: finalResponse,
              },
            }),
          );

          // Attempt to extract name and description if this is one of the first interactions
          // We check if the name looks like a slug (contains dashes and potentially matches the patterns)
          const isDefaultName = app.codespaceId && app.codespaceId.includes("-");

          if (isDefaultName) {
            // We fire this off without awaiting it to not block the stream closing immediately
            // (Next.js might kill it if we don't await, but `waitUntil` is not standard here yet.
            //  However, since we have maxDuration 300s, we can just await it. It's better for UX if we don't, but safer if we do.)
            // Let's await it to ensure it runs.
            await generateAppDetails(id, finalResponse, content);
          }
        }

        controller.close();
      } catch (error) {
        console.error("[agent/chat] Streaming error:", error);
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
async function generateAppDetails(appId: string, agentResponse: string, userPrompt: string) {
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

    const details = JSON.parse(jsonStr);

    if (details.name && details.description) {
      await prisma.app.update({
        where: { id: appId },
        data: {
          name: details.name,
          description: details.description,
        },
      });
      console.log(`[agent/chat] Updated app details: ${details.name}`);
    }
  } catch (e) {
    console.error("[agent/chat] Failed to generate app details:", e);
  }
}
