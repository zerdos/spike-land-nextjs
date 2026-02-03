export const maxDuration = 60; // Allow 60s for AI generation

import { auth } from "@/auth";
import { generateLearnItTopic } from "@/lib/learnit/content-generator";
import {
  createOrUpdateContent,
  getLearnItContent,
  markAsGenerating,
} from "@/lib/learnit/content-service";
import { generateTopicSchema } from "@/lib/learnit/validations";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const { path } = generateTopicSchema.parse(json);
    const slug = path.join("/").toLowerCase();

    // Check if duplicate generation is running or content exists
    const existing = await getLearnItContent(slug);
    if (existing && existing.status === "PUBLISHED") {
      return NextResponse.json(existing);
    }

    if (existing?.status === "GENERATING") {
      // Basic safeguard: if it was generated < 2 mins ago, assume it's still running
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (existing.generatedAt > twoMinutesAgo) {
        return NextResponse.json({ status: "GENERATING" }, { status: 202 });
      }
    }

    // Mark as generating immediately to prevent race conditions
    await markAsGenerating(slug, path, session.user.id);

    // Trigger AI generation
    // We intentionally await this for Vercel functions unless we use background jobs using triggers/queues.
    // Given the `maxDuration`, we can await it.
    const generated = await generateLearnItTopic(path);

    if (!generated) {
      // Handle failure
      return new NextResponse("Generation failed", { status: 500 });
    }

    // Save to DB
    const saved = await createOrUpdateContent({
      slug,
      path,
      parentSlug: path.length > 1 ? path.slice(0, -1).join("/") : null,
      title: generated.title,
      description: generated.description,
      content: generateMdxFromResponse(generated), // Helper to stitch sections
      generatedById: session.user.id,
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error("LearnIt Generate Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function generateMdxFromResponse(
  generated: import("@/lib/learnit/content-generator").GeneratedLearnItContent,
): string {
  let mdx = "";

  // Sections
  generated.sections.forEach(section => {
    mdx += `\n\n## ${section.heading}\n\n${section.content}`;
  });

  // Related Topics
  if (generated.relatedTopics?.length > 0) {
    mdx +=
      `\n\n---\n\n### Detailed Related Topics\n\nThe following topics are typically studied next:\n`;
    generated.relatedTopics.forEach(topic => {
      mdx += `- [[${topic}]]\n`;
    });
  }

  return mdx;
}
