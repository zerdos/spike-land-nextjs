/**
 * Skill Store API - Public catalog
 *
 * GET /api/store/skills - List published skills with optional filters
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { skillQuerySchema } from "@/lib/types/skill";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parsed = skillQuerySchema.safeParse({
    category: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { category, search, limit, offset } = parsed.data;

  const { data: skills, error } = await tryCatch(
    prisma.skill.findMany({
      where: {
        isActive: true,
        status: "PUBLISHED",
        ...(category && { category }),
        ...(search && {
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { tags: { hasSome: [search.toLowerCase()] } },
          ],
        }),
      },
      include: {
        features: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { installations: true },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { installCount: "desc" },
      ],
      take: limit,
      skip: offset,
    }),
  );

  if (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    skills,
    pagination: {
      limit,
      offset,
      hasMore: skills.length === limit,
    },
  });
}
