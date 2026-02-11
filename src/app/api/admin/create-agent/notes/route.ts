/**
 * Notes Effectiveness API Route
 *
 * Provides learning notes analytics for the create-agent admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionResult = await tryCatch(auth());

  if (sessionResult.error) {
    console.error("Failed to fetch notes analytics:", sessionResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const session = sessionResult.data;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }

  // Notes by status
  const byStatusResult = await tryCatch(
    prisma.agentLearningNote.groupBy({
      by: ["status"],
      _count: true,
    }),
  );
  if (byStatusResult.error) {
    console.error("Failed to fetch notes by status:", byStatusResult.error);
  }

  // Top 10 most effective notes
  const topEffectiveResult = await tryCatch(
    prisma.agentLearningNote.findMany({
      where: { status: { not: "DEPRECATED" } },
      orderBy: { helpCount: "desc" },
      take: 10,
      select: {
        id: true,
        trigger: true,
        lesson: true,
        helpCount: true,
        failCount: true,
        confidenceScore: true,
        status: true,
      },
    }),
  );
  if (topEffectiveResult.error) {
    console.error(
      "Failed to fetch top effective notes:",
      topEffectiveResult.error,
    );
  }

  // Bottom 10 most failing notes
  const bottomFailingResult = await tryCatch(
    prisma.agentLearningNote.findMany({
      where: { failCount: { gt: 0 } },
      orderBy: { failCount: "desc" },
      take: 10,
      select: {
        id: true,
        trigger: true,
        lesson: true,
        helpCount: true,
        failCount: true,
        confidenceScore: true,
        status: true,
      },
    }),
  );
  if (bottomFailingResult.error) {
    console.error(
      "Failed to fetch bottom failing notes:",
      bottomFailingResult.error,
    );
  }

  // Total count
  const totalResult = await tryCatch(prisma.agentLearningNote.count());
  if (totalResult.error) {
    console.error("Failed to fetch total notes count:", totalResult.error);
  }

  // Average confidence
  const avgConfidenceResult = await tryCatch(
    prisma.agentLearningNote.aggregate({
      _avg: { confidenceScore: true },
    }),
  );
  if (avgConfidenceResult.error) {
    console.error(
      "Failed to fetch average confidence:",
      avgConfidenceResult.error,
    );
  }

  return NextResponse.json({
    byStatus: byStatusResult.data ?? [],
    topEffective: topEffectiveResult.data ?? [],
    bottomFailing: bottomFailingResult.data ?? [],
    totalNotes: totalResult.data ?? 0,
    averageConfidence:
      avgConfidenceResult.data?._avg?.confidenceScore ?? 0,
  });
}
