/**
 * Skill Store API - Skill detail
 *
 * GET /api/store/skills/[skillId] - Get a single skill by slug or ID
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const { skillId } = await params;

  const { data: skill, error } = await tryCatch(
    prisma.skill.findFirst({
      where: {
        OR: [
          { slug: skillId },
          { id: skillId },
        ],
        isActive: true,
        status: "PUBLISHED",
      },
      include: {
        features: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { installations: true },
        },
      },
    }),
  );

  if (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json(
      { error: "Failed to fetch skill" },
      { status: 500 },
    );
  }

  if (!skill) {
    return NextResponse.json(
      { error: "Skill not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    skill,
  });
}
