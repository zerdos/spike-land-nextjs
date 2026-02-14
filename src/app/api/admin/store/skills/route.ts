/**
 * Admin Skill Store API
 *
 * GET /api/admin/store/skills - List all skills (including drafts)
 * POST /api/admin/store/skills - Create a new skill
 * PATCH /api/admin/store/skills - Update an existing skill
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { createSkillSchema, updateSkillSchema } from "@/lib/types/skill";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );
  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: skills, error } = await tryCatch(
    prisma.skill.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, skills });
}

export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );
  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());
  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = createSkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: skill, error: createError } = await tryCatch(
    prisma.skill.create({
      data: {
        ...parsed.data,
        createdBy: session.user.id,
      },
      include: {
        features: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating skill:", createError);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, skill });
}

export async function PATCH(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );
  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());
  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = updateSkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...updateData } = parsed.data;

  const { data: skill, error: updateError } = await tryCatch(
    prisma.skill.update({
      where: { id },
      data: updateData,
      include: {
        features: true,
        _count: { select: { installations: true } },
      },
    }),
  );

  if (updateError) {
    console.error("Error updating skill:", updateError);
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, skill });
}
