export const maxDuration = 60; // Allow 60s for AI generation
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import {
  createOrUpdateContent,
  getLearnItContent,
  markAsFailed,
  markAsGenerating,
} from "@/lib/learnit/content-service";
import { generateTopicSchema } from "@/lib/learnit/validations";
import { parseWikiLinks } from "@/lib/learnit/wiki-links";
import logger from "@/lib/logger";
import { checkGenerationRateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Streaming endpoint for LearnIt content generation.
 * Uses Server-Sent Events (SSE) to stream AI-generated content to the client.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const ip = getClientIp(req);

  const { allowed, retryAfterSeconds } = await checkGenerationRateLimit(ip, !!userId);
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: "Rate limit exceeded", retryAfterSeconds }),
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parsed = generateTopicSchema.safeParse(json);
  if (!parsed.success) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const { path } = parsed.data;
  const slug = path.join("/").toLowerCase();

  // Check if content already exists
  const existing = await getLearnItContent(slug);
  if (existing && existing.status === "PUBLISHED") {
    // Return existing content as a single SSE event
    const existingContent = existing;
    async function* existingContentGenerator(): AsyncGenerator<StreamEvent> {
      yield {
        type: "complete",
        content: existingContent.content,
        title: existingContent.title,
        description: existingContent.description,
      };
    }
    return createSSEResponse(existingContentGenerator());
  }

  // Check if already generating
  if (existing?.status === "GENERATING") {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (existing.generatedAt > twoMinutesAgo) {
      return new NextResponse(
        JSON.stringify({ status: "GENERATING", message: "Content is already being generated" }),
        { status: 202 },
      );
    }
  }

  // Mark as generating
  await markAsGenerating(slug, path, userId);

  // Create SSE stream
  return createSSEResponse(generateStreamContent(path, slug, userId));
}

async function* generateStreamContent(
  path: string[],
  slug: string,
  userId: string | undefined,
): AsyncGenerator<StreamEvent> {
  const topic = path.join(" > ");

  const prompt =
    `You are an expert technical educator creating a high-quality, interactive learning wiki called LearnIt.

Your task is to generate a comprehensive tutorial for the topic: "${topic}".

The content should be:
1. **Beginner-friendly but deep**: targeted at developers learning this specific concept.
2. **Structured**: Broken into clear sections with H2 headings.
3. **Interactive**: Include code examples where relevant.
4. **Interconnected**: Use [[Wiki Link]] syntax to link to related concepts. For example, if you mention "State Management", write it as [[State Management]].

Format requirements:
- Start with a brief title and description
- Use ## for section headings
- Ensure code blocks have language tags (e.g. \`\`\`typescript).
- At the end, include a "Related Topics" section with 3-5 [[Wiki Links]] to related concepts.

Begin with the title on the first line (just the title text, no heading markup), followed by a brief description paragraph, then the main content.`;

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });

    let fullContent = "";
    let title = "";
    let description = "";
    let lineCount = 0;

    for await (const chunk of response) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        fullContent += text;

        // Extract title from first line if not set
        if (!title) {
          const lines = fullContent.split("\n");
          const firstLine = lines[0];
          if (firstLine?.trim()) {
            title = firstLine.trim().replace(/^#*\s*/, ""); // Remove any leading # marks
          }
        }

        // Extract description from second paragraph
        if (!description && fullContent.includes("\n\n")) {
          const contentParts = fullContent.split("\n\n");
          const secondPart = contentParts[1];
          if (secondPart?.trim()) {
            description = secondPart.trim().substring(0, 200);
          }
        }

        // Stream the chunk to the client
        yield { type: "chunk", content: text };
        lineCount++;

        // Log progress periodically
        if (lineCount % 10 === 0) {
          logger.info(`LearnIt streaming: ${lineCount} chunks sent`, { slug });
        }
      }
    }

    // Finalize - extract title and description if not yet set
    if (!title) {
      title = path[path.length - 1]?.replace(/-/g, " ") ?? "Topic";
    }
    if (!description) {
      description = `Learn about ${title}`;
    }

    // Process wiki links and save to database
    logger.info("Generated full content length", { length: fullContent.length });
    const { content: processedContent } = parseWikiLinks(fullContent);

    // Remove the title line from content since it's stored separately
    let finalContent = processedContent;
    const firstNewline = processedContent.indexOf("\n");
    if (firstNewline > 0) {
      finalContent = processedContent.substring(firstNewline + 1).trim();
    }

    await createOrUpdateContent({
      slug,
      path,
      parentSlug: path.length > 1 ? path.slice(0, -1).join("/") : null,
      title,
      description,
      content: finalContent,
      generatedById: userId,
      aiModel: "gemini-3-flash-preview",
    });

    yield { type: "complete", content: finalContent, title, description };
  } catch (error) {
    logger.error("LearnIt streaming error:", { error, slug });
    await markAsFailed(slug);
    // Explicitly use the error to satisfy linter if needed
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    logger.error("LearnIt streaming failed", { errorMessage });
    yield { type: "error", message: errorMessage };
  }
}

type StreamEvent =
  | { type: "chunk"; content: string; }
  | { type: "complete"; content: string; title: string; description: string; }
  | { type: "error"; message: string; };

function createSSEResponse(generator: AsyncGenerator<StreamEvent>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.close();
      } catch (error) {
        const errorEvent = JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "Stream error",
        });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
