/**
 * Skill Store API - Install tracking
 *
 * POST /api/store/skills/[skillId]/install - Record a skill installation
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { createHash } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const { skillId } = await params;

  // Find the skill by slug or ID
  const { data: skill, error: skillError } = await tryCatch(
    prisma.skill.findFirst({
      where: {
        OR: [
          { slug: skillId },
          { id: skillId },
        ],
        isActive: true,
        status: "PUBLISHED",
      },
    }),
  );

  if (skillError || !skill) {
    return NextResponse.json(
      { error: "Skill not found" },
      { status: 404 },
    );
  }

  // Get user ID if authenticated
  const { data: session } = await tryCatch(auth());
  const userId = session?.user?.id ?? null;

  // Hash IP for anonymous tracking
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  // Create installation record (skip duplicates for authenticated users)
  if (userId) {
    const { error: installError } = await tryCatch(
      prisma.skillInstallation.upsert({
        where: {
          skillId_userId: {
            skillId: skill.id,
            userId,
          },
        },
        update: {},
        create: {
          skillId: skill.id,
          userId,
          ipHash,
        },
      }),
    );

    if (installError) {
      console.error("Error recording installation:", installError);
    }
  } else {
    const { error: installError } = await tryCatch(
      prisma.skillInstallation.create({
        data: {
          skillId: skill.id,
          ipHash,
        },
      }),
    );

    if (installError) {
      console.error("Error recording anonymous installation:", installError);
    }
  }

  // Increment install count
  await tryCatch(
    prisma.skill.update({
      where: { id: skill.id },
      data: { installCount: { increment: 1 } },
    }),
  );

  return NextResponse.json({
    success: true,
    installCommand: `claude skill add spike-land/${skill.slug}`,
  });
}
