/**
 * A/B Test Variation Generator
 *
 * Uses AI to generate content variations for A/B testing.
 * Resolves #840
 */

import { auth } from "@/auth";
import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { VariationType } from "@/types/ab-test";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ workspaceSlug: string }>;
}

const generateVariationsSchema = z.object({
  originalContent: z.string().min(1),
  variationTypes: z
    .array(z.enum(["headline", "cta", "emoji", "hashtags", "tone"]))
    .min(1)
    .max(5),
  count: z.number().min(1).max(3).default(2),
});

const variationResponseSchema = z.object({
  variations: z.array(
    z.object({
      type: z.enum(["headline", "cta", "emoji", "hashtags", "tone"]),
      content: z.string(),
      reasoning: z.string().optional(),
    })
  ),
});

/**
 * POST /api/orbit/[workspaceSlug]/ab-tests/generate-variations
 * Generate AI-powered content variations for A/B testing
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate
  const body = await request.json();
  const validated = generateVariationsSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 }
    );
  }

  const { originalContent, variationTypes, count } = validated.data;

  try {
    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: {
        id: true,
        brandProfile: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    await requireWorkspacePermission(session, workspace.id, "content:create");

    // Build prompt for AI
    const prompt = buildVariationPrompt(
      originalContent,
      variationTypes,
      count,
      workspace.brandProfile
        ? {
            brandName: workspace.brandProfile.name,
            tone: workspace.brandProfile.mission,
            targetAudience: null,
          }
        : null
    );

    // Generate variations using AI
    const { data: result, error: aiError } = await tryCatch(
      generateStructuredResponse<z.infer<typeof variationResponseSchema>>({
        prompt,
        systemPrompt:
          "You are an expert social media copywriter. Generate engaging variations that maintain the core message while testing different approaches.",
        temperature: 0.7,
      })
    );

    if (aiError || !result) {
      console.error("AI generation error:", aiError);
      return NextResponse.json(
        { error: "Failed to generate variations" },
        { status: 500 }
      );
    }

    // Validate response schema
    const parsedResult = variationResponseSchema.safeParse(result);

    if (!parsedResult.success) {
      console.error("Invalid AI response schema:", parsedResult.error);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResult.data);
  } catch (error: unknown) {
    console.error("Failed to generate variations:", error);
    return NextResponse.json(
      { error: "Failed to generate variations" },
      { status: 500 }
    );
  }
}

/**
 * Build AI prompt for generating content variations
 */
function buildVariationPrompt(
  originalContent: string,
  variationTypes: VariationType[],
  count: number,
  brandProfile?: {
    brandName?: string | null;
    tone?: string | null;
    targetAudience?: string | null;
  } | null
): string {
  const brandContext = brandProfile
    ? `
Brand: ${brandProfile.brandName || "Not specified"}
Tone: ${brandProfile.tone || "Professional"}
Target Audience: ${brandProfile.targetAudience || "General"}
`
    : "";

  return `You are an expert social media copywriter. Generate ${count} variations for each requested type.

${brandContext}

Original Content:
"""
${originalContent}
"""

Generate variations for: ${variationTypes.join(", ")}

Guidelines:
- For "headline": Change the opening hook while keeping the message
- For "cta": Modify the call-to-action wording/urgency
- For "emoji": Add, remove, or change emoji placement
- For "hashtags": Vary the hashtag strategy (trending, niche, branded)
- For "tone": Adjust the voice (formal/casual, urgent/relaxed, etc.)

Keep each variation close to the original length and preserve the core message.

Return a JSON object with the following structure:
{
  "variations": [
    {
      "type": "headline" | "cta" | "emoji" | "hashtags" | "tone",
      "content": "The varied content",
      "reasoning": "Brief explanation of the change"
    }
  ]
}`;
}
