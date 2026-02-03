import { auth } from "@/auth";
import {
  createPortfolioItem,
  deletePortfolioItem,
  getPortfolioItemBySlug,
  getPortfolioItems,
  updatePortfolioItem,
} from "@/lib/agency/portfolio-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const portfolioItemSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  url: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  screenshots: z.array(z.string().url()).optional().default([]),
  technologies: z.array(z.string()).optional().default([]),
  category: z.enum(["AI_INTEGRATION", "WEB_APP", "MOBILE_APP", "PROTOTYPE", "OPEN_SOURCE"]),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

const querySchema = z.object({
  category: z.enum(["AI_INTEGRATION", "WEB_APP", "MOBILE_APP", "PROTOTYPE", "OPEN_SOURCE"])
    .optional(),
  featured: z.preprocess(
    (val) => val === "true" ? true : val === "false" ? false : undefined,
    z.boolean().optional(),
  ),
  limit: z.preprocess(
    (val) => val ? parseInt(val as string, 10) : undefined,
    z.number().int().positive().optional(),
  ),
});

/**
 * GET /api/agency/portfolio
 * Get portfolio items with optional filters
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") || undefined,
    featured: searchParams.get("featured") || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const items = await getPortfolioItems(parsed.data);
  return NextResponse.json(items);
}

/**
 * POST /api/agency/portfolio
 * Create a new portfolio item (admin only)
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

  const parsed = portfolioItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check for duplicate slug
  const existing = await getPortfolioItemBySlug(parsed.data.slug);
  if (existing) {
    return NextResponse.json(
      { error: "A portfolio item with this slug already exists" },
      { status: 409 },
    );
  }

  const item = await createPortfolioItem(parsed.data);
  return NextResponse.json(item, { status: 201 });
}

/**
 * PATCH /api/agency/portfolio?slug=item-slug
 * Update an existing portfolio item (admin only)
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

  // Check if item exists
  const existing = await getPortfolioItemBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Portfolio item not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = portfolioItemSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updatePortfolioItem(slug, parsed.data);
  return NextResponse.json(updated);
}

/**
 * DELETE /api/agency/portfolio?slug=item-slug
 * Delete a portfolio item (admin only)
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

  // Check if item exists
  const existing = await getPortfolioItemBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Portfolio item not found" }, { status: 404 });
  }

  await deletePortfolioItem(slug);
  return new NextResponse(null, { status: 204 });
}
