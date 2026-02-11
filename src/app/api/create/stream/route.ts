import { auth } from "@/auth";
import { generateCodespaceId, updateCodespace } from "@/lib/create/codespace-service";
import { attemptCodeCorrection, generateAppContent } from "@/lib/create/content-generator";
import {
  getCreatedApp,
  markAsGenerating,
  updateAppContent,
  updateAppStatus,
} from "@/lib/create/content-service";
import { type StreamEvent } from "@/lib/create/types";
import { agentGenerateApp } from "@/lib/create/agent-loop";
import logger from "@/lib/logger";
import { checkGenerationRateLimit, getClientIp } from "@/lib/rate-limit";
import { CreatedAppStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 120; // 120s for agent loop (was 60s)
export const dynamic = "force-dynamic";

const CreateRequestSchema = z.object({
  path: z.array(z.string()),
});

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

  const parsed = CreateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  const { path } = parsed.data;
  if (path.length === 0) {
    return new NextResponse("Path cannot be empty", { status: 400 });
  }

  const slug = path.join("/").toLowerCase();

  // Check if app already exists and is published
  const existing = await getCreatedApp(slug);
  if (existing?.status === CreatedAppStatus.PUBLISHED) {
    return NextResponse.json({
      status: "PUBLISHED",
      url: existing.codespaceUrl,
      slug: existing.slug,
    });
  }

  // Check if already generating
  if (existing?.status === CreatedAppStatus.GENERATING) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    // If generating for more than 2 mins, assume stuck and allow retry
    if (existing.generatedAt > twoMinutesAgo) {
      return new NextResponse(
        JSON.stringify({
          status: "GENERATING",
          message: "App is already being generated",
        }),
        { status: 202 },
      );
    }
  }

  // Start streaming response
  return createSSEResponse(generateStream(slug, path, userId));
}

/**
 * Main generation stream — delegates to the Claude agent loop,
 * with automatic fallback to Gemini if Claude is unavailable.
 */
async function* generateStream(
  slug: string,
  path: string[],
  userId: string | undefined,
): AsyncGenerator<StreamEvent> {
  // Use Claude agent loop when API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      yield* agentGenerateApp(slug, path, userId);
      return;
    } catch (error) {
      logger.warn("Agent loop failed, falling back to Gemini generation", {
        error: error instanceof Error ? error.message : "Unknown error",
        slug,
      });
      // Fall through to Gemini fallback
    }
  }

  // Fallback: Original Gemini-based generation
  yield* geminiFallbackStream(slug, path, userId);
}

/**
 * Original Gemini-based generation flow — kept as circuit breaker fallback.
 */
async function* geminiFallbackStream(
  slug: string,
  path: string[],
  userId: string | undefined,
): AsyncGenerator<StreamEvent> {
  const codespaceId = generateCodespaceId(slug);
  const codespaceUrl = `https://testing.spike.land/live/${codespaceId}/`;

  try {
    yield { type: "status", message: "Initializing app generation..." };

    const placeholderTitle = path[path.length - 1]?.replace(/-/g, " ") || "New App";
    await markAsGenerating(
      slug,
      path,
      placeholderTitle,
      "Generating app...",
      codespaceId,
      codespaceUrl,
      `Create app from path: ${slug}`,
      userId,
    );

    yield { type: "status", message: "Designing application logic..." };

    const { content, rawCode, error: genError } = await generateAppContent(path);

    const codeToPush = content?.code ?? rawCode;

    if (!codeToPush) {
      throw new Error(genError || "Failed to generate content from AI");
    }

    yield { type: "status", message: "Writing code..." };

    let updateResult = await updateCodespace(codespaceId, codeToPush);

    if (!updateResult.success && updateResult.error) {
      yield { type: "status", message: "Fixing transpilation error..." };

      const correctedCode = await attemptCodeCorrection(
        codeToPush,
        updateResult.error,
        slug,
      );

      if (correctedCode) {
        updateResult = await updateCodespace(codespaceId, correctedCode);

        if (updateResult.success && content) {
          content.code = correctedCode;
        }
      }
    }

    if (!updateResult.success) {
      throw new Error(updateResult.error || "Failed to update codespace");
    }

    if (!content) {
      logger.error(`App generation partially failed for ${slug}: ${genError}`);
      try {
        await updateAppStatus(slug, CreatedAppStatus.FAILED);
      } catch (updateError) {
        logger.error(`Failed to mark app ${slug} as FAILED:`, { updateError });
      }
      yield {
        type: "error",
        message: genError || "Generated content failed validation",
        codespaceUrl,
      };
      return;
    }

    yield { type: "status", message: "Finalizing..." };

    const relatedLinks = content.relatedApps || [];

    await updateAppContent(slug, content.title, content.description);
    await updateAppStatus(slug, CreatedAppStatus.PUBLISHED, relatedLinks);

    yield {
      type: "complete",
      slug,
      url: codespaceUrl,
      title: content.title,
      description: content.description,
      relatedApps: relatedLinks,
    };
  } catch (error) {
    logger.error(`App generation failed for ${slug}:`, { error });
    try {
      await updateAppStatus(slug, CreatedAppStatus.FAILED);
    } catch (updateError) {
      logger.error(`Failed to mark app ${slug} as FAILED:`, { updateError });
    }

    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Generation failed",
      codespaceUrl,
    };
  }
}

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
