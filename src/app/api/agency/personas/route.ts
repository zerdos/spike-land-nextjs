import { auth } from "@/auth";
import {
  createPersona,
  deletePersona,
  getPersonaBySlug,
  getPersonas,
  updatePersona,
} from "@/lib/agency/persona-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const personaSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  tagline: z.string().min(1).max(500),
  demographics: z.object({
    age: z.string().optional(),
    gender: z.string().optional(),
    income: z.string().optional(),
    location: z.string().optional(),
    platform: z.string().optional(),
    jobTitle: z.string().optional(),
  }),
  psychographics: z.array(z.string()),
  painPoints: z.array(z.string()),
  triggers: z.array(z.string()),
  primaryHook: z.string().min(1),
  adCopyVariations: z.array(z.string()),
  predictedProfit: z.number().min(0).max(100),
  stressLevel: z.number().min(0).max(10),
  rank: z.number().int().positive(),
  landingPageSlug: z.string().nullable().optional(),
});

const querySchema = z.object({
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().positive().optional(),
  ),
  minProfit: z.preprocess(
    (val) => (val ? parseFloat(val as string) : undefined),
    z.number().optional(),
  ),
  minStress: z.preprocess(
    (val) => (val ? parseFloat(val as string) : undefined),
    z.number().optional(),
  ),
});

/**
 * GET /api/agency/personas
 * Get personas with optional filters
 */
export async function GET(req: Request) {
  // Personas are admin-only data
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    limit: searchParams.get("limit") || undefined,
    minProfit: searchParams.get("minProfit") || undefined,
    minStress: searchParams.get("minStress") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const personas = await getPersonas(parsed.data);
  return NextResponse.json(personas);
}

/**
 * POST /api/agency/personas
 * Create a new persona (admin only)
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = personaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check for duplicate slug
  const existing = await getPersonaBySlug(parsed.data.slug);
  if (existing) {
    return NextResponse.json(
      { error: "A persona with this slug already exists" },
      { status: 409 },
    );
  }

  const persona = await createPersona(parsed.data);
  return NextResponse.json(persona, { status: 201 });
}

/**
 * PATCH /api/agency/personas?slug=persona-slug
 * Update an existing persona (admin only)
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const existing = await getPersonaBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = personaSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updatePersona(slug, parsed.data);
  return NextResponse.json(updated);
}

/**
 * DELETE /api/agency/personas?slug=persona-slug
 * Delete a persona (admin only)
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const existing = await getPersonaBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  await deletePersona(slug);
  return new NextResponse(null, { status: 204 });
}
