import { getClaudeClient } from "@/lib/ai/claude-client";
import { BAZDMEG_SYSTEM_PROMPT } from "@/lib/bazdmeg/system-prompt";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/rate-limit";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Rate limit by IP (public endpoint, no auth required)
  const ip = getClientIp(request);
  const { isLimited } = await checkRateLimit(`bazdmeg:chat:${ip}`, {
    maxRequests: 10,
    windowMs: 60000,
  });

  if (isLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, sessionId } = body as { question?: string; sessionId?: string };

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 },
    );
  }

  if (question.length > 2000) {
    return NextResponse.json(
      { error: "Question too long (max 2000 characters)" },
      { status: 400 },
    );
  }

  const anthropic = await getClaudeClient();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullAnswer = "";
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const messageStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: BAZDMEG_SYSTEM_PROMPT,
          messages: [{ role: "user", content: question.trim() }],
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullAnswer += event.delta.text;
            const data = JSON.stringify({
              type: "text",
              text: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        const finalMessage = await messageStream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;

        const doneData = JSON.stringify({
          type: "done",
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        const errData = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        controller.close();
        return;
      }

      // Fire-and-forget: save to DB and create GitHub issue
      saveAndCreateIssue({
        sessionId: sessionId || "anonymous",
        question: question.trim(),
        answer: fullAnswer,
        inputTokens,
        outputTokens,
      }).catch((err: unknown) =>
        console.error("Failed to save chat message:", err),
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Fire-and-forget: persist chat message to database */
async function saveAndCreateIssue(data: {
  sessionId: string;
  question: string;
  answer: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const prisma = (await import("@/lib/prisma")).default;

  await prisma.bazdmegChatMessage.create({
    data: {
      sessionId: data.sessionId,
      question: data.question,
      answer: data.answer,
      model: "haiku",
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
    },
  });
}

/** GET: return chat stats (message count) */
export async function GET() {
  const prisma = (await import("@/lib/prisma")).default;
  const count = await prisma.bazdmegChatMessage.count();
  return NextResponse.json({ totalQuestions: count });
}
