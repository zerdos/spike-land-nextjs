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

  // Use a transaction to atomically record installation + increment count.
  // This prevents the race condition where rapid clicks inflate the count
  // while the upsert is a no-op.
  if (userId) {
    const { error: txError } = await tryCatch(
      prisma.$transaction(async (tx) => {
        // Check if already installed by this user
        const existing = await tx.skillInstallation.findUnique({
          where: {
            skillId_userId: {
              skillId: skill.id,
              userId,
            },
          },
        });

        if (existing) {
          // Already installed — don't increment count
          return;
        }

        await tx.skillInstallation.create({
          data: {
            skillId: skill.id,
            userId,
            ipHash,
          },
        });

        await tx.skill.update({
          where: { id: skill.id },
          data: { installCount: { increment: 1 } },
        });
      }),
    );

    if (txError) {
      console.error("Error recording installation:", txError);
    }
  } else {
    // Anonymous installs: deduplicate by ipHash within the last 24 hours
    const { error: txError } = await tryCatch(
      prisma.$transaction(async (tx) => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAnonymous = await tx.skillInstallation.findFirst({
          where: {
            skillId: skill.id,
            userId: null,
            ipHash,
            createdAt: { gte: oneDayAgo },
          },
        });

        if (recentAnonymous) {
          // Same anonymous user within 24h — don't inflate count
          return;
        }

        await tx.skillInstallation.create({
          data: {
            skillId: skill.id,
            ipHash,
          },
        });

        await tx.skill.update({
          where: { id: skill.id },
          data: { installCount: { increment: 1 } },
        });
      }),
    );

    if (txError) {
      console.error("Error recording anonymous installation:", txError);
    }
  }

  return NextResponse.json({
    success: true,
    installCommand: `claude skill add spike-land/${skill.slug}`,
  });
}
