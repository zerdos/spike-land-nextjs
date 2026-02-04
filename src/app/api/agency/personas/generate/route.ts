export const maxDuration = 120; // Allow 2 minutes for AI generation

import { auth } from "@/auth";
import { generateAndSavePersonas, generateTargetedPersona } from "@/lib/agency/persona-generator";
import { createPersona, getPersonaCount } from "@/lib/agency/persona-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const generateBulkSchema = z.object({
  count: z.number().int().min(1).max(20).default(10),
  industry: z.string().optional(),
});

const generateTargetedSchema = z.object({
  industry: z.string().min(1),
  companySize: z.enum(["startup", "smb", "enterprise"]),
  urgency: z.enum(["low", "medium", "high"]),
  budget: z.enum(["low", "medium", "high"]),
});

/**
 * POST /api/agency/personas/generate
 * Generate AI-powered customer personas
 *
 * Body options:
 * 1. Bulk generation: { count: number, industry?: string }
 * 2. Targeted generation: { industry, companySize, urgency, budget }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // TODO: Add admin role check
  // if (!session.user.isAdmin) {
  //   return new NextResponse("Forbidden", { status: 403 });
  // }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Check if it's a targeted generation request
  const targetedParsed = generateTargetedSchema.safeParse(json);
  if (targetedParsed.success) {
    const persona = await generateTargetedPersona(targetedParsed.data);

    if (!persona) {
      return NextResponse.json(
        { error: "Failed to generate persona" },
        { status: 500 },
      );
    }

    // Get current count for ranking
    const currentCount = await getPersonaCount();

    // Save to database
    const saved = await createPersona({
      ...persona,
      rank: currentCount + 1,
    });

    return NextResponse.json({
      type: "targeted",
      persona: saved,
    });
  }

  // Bulk generation
  const bulkParsed = generateBulkSchema.safeParse(json);
  if (!bulkParsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details:
          "Provide either { count, industry? } for bulk or { industry, companySize, urgency, budget } for targeted",
      },
      { status: 400 },
    );
  }

  const { count, industry } = bulkParsed.data;

  try {
    const result = await generateAndSavePersonas(count, industry);

    return NextResponse.json({
      type: "bulk",
      requested: count,
      generated: result.generated,
      saved: result.saved,
      message: `Generated ${result.generated} personas, saved ${result.saved} new ones`,
    });
  } catch (error) {
    console.error("Persona generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate personas" },
      { status: 500 },
    );
  }
}
