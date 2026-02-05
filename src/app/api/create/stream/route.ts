import { auth } from "@/auth";
import { generateCodespaceId, updateCodespace } from "@/lib/create/codespace-service";
import { generateAppContent } from "@/lib/create/content-generator";
import { getCreatedApp, markAsGenerating, updateAppStatus } from "@/lib/create/content-service";
import { type StreamEvent } from "@/lib/create/types";
import logger from "@/lib/logger";
import { CreatedAppStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60; // Allow 60s for generation
export const dynamic = "force-dynamic";

const CreateRequestSchema = z.object({
  path: z.array(z.string()),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
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
  return createSSEResponse(generateStream(slug, path, session.user.id));
}

async function* generateStream(
  slug: string,
  path: string[],
  userId: string,
): AsyncGenerator<StreamEvent> {
  try {
    yield { type: "status", message: "Initializing app generation..." };

    const codespaceId = generateCodespaceId(slug);
    const codespaceUrl = `https://testing.spike.land/live/${codespaceId}/`;

    // 1. Mark as generating in DB
    // We need initial title/desc, use placeholders until we generate them
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

    // 2. Generate content with AI
    yield { type: "status", message: "Designing application logic..." };

    // This might take 10-20s
    const generatedContent = await generateAppContent(path);

    if (!generatedContent) {
      throw new Error("Failed to generate content from AI");
    }

    yield { type: "status", message: "Writing code..." };

    // 3. Update Codespace
    const updateResult = await updateCodespace(codespaceId, generatedContent.code);

    if (!updateResult.success) {
      throw new Error(updateResult.error || "Failed to update codespace");
    }

    // 4. Update DB as PUBLISHED
    yield { type: "status", message: "Finalizing..." };

    // Extract outgoing links if any found in code or use the suggestions
    // We prefer the explicit relatedApps from AI
    const relatedLinks = generatedContent.relatedApps || [];
    // Or parse them from method: const parsedLinks = extractOutgoingLinks(generatedContent.code);

    // We need to update the title/description with the generated ones
    await markAsGenerating(
      slug,
      path,
      generatedContent.title,
      generatedContent.description,
      codespaceId,
      codespaceUrl,
      `Create app from path: ${slug}`,
      userId,
    );

    await updateAppStatus(slug, CreatedAppStatus.PUBLISHED, relatedLinks);

    yield {
      type: "complete",
      slug,
      url: codespaceUrl,
      title: generatedContent.title,
      description: generatedContent.description,
      relatedApps: relatedLinks,
    };
  } catch (error) {
    logger.error(`App generation failed for ${slug}:`, { error });
    // Mark as failed in DB
    await updateAppStatus(slug, CreatedAppStatus.FAILED);

    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Generation failed",
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
