/**
 * Create Agent Metrics API Route
 *
 * Provides generation metrics for the create-agent admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { calculateTokenCost } from "@/lib/create/cost-calculator";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionResult = await tryCatch(auth());

  if (sessionResult.error) {
    console.error("Failed to fetch metrics:", sessionResult.error);
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Success rates
  const successRate24hResult = await tryCatch(
    prisma.$queryRaw<Array<{ total: bigint; successes: bigint }>>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE success = true)::bigint as successes
      FROM "GenerationAttempt"
      WHERE "createdAt" >= ${last24h}
    `,
  );
  if (successRate24hResult.error) {
    console.error(
      "Failed to fetch 24h success rate:",
      successRate24hResult.error,
    );
  }

  const successRate7dResult = await tryCatch(
    prisma.$queryRaw<Array<{ total: bigint; successes: bigint }>>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE success = true)::bigint as successes
      FROM "GenerationAttempt"
      WHERE "createdAt" >= ${last7d}
    `,
  );
  if (successRate7dResult.error) {
    console.error(
      "Failed to fetch 7d success rate:",
      successRate7dResult.error,
    );
  }

  // Latency percentiles (last 7 days)
  const latencyResult = await tryCatch(
    prisma.$queryRaw<
      Array<{ p50: number | null; p75: number | null; p95: number | null }>
    >`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "totalDurationMs") as p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "totalDurationMs") as p75,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "totalDurationMs") as p95
      FROM "GenerationAttempt"
      WHERE "createdAt" >= ${last7d}
    `,
  );
  if (latencyResult.error) {
    console.error("Failed to fetch latency percentiles:", latencyResult.error);
  }

  // Iterations histogram
  const iterationsResult = await tryCatch(
    prisma.$queryRaw<Array<{ iterations: number; count: bigint }>>`
      SELECT iterations, COUNT(*)::bigint as count
      FROM "GenerationAttempt"
      WHERE "createdAt" >= ${last7d}
      GROUP BY iterations
      ORDER BY iterations ASC
    `,
  );
  if (iterationsResult.error) {
    console.error(
      "Failed to fetch iterations histogram:",
      iterationsResult.error,
    );
  }

  // Model comparison
  const modelComparisonResult = await tryCatch(
    prisma.$queryRaw<
      Array<{
        model: string;
        total: bigint;
        successes: bigint;
        avg_duration: number | null;
        total_input_tokens: bigint;
        total_output_tokens: bigint;
        total_cached_tokens: bigint;
      }>
    >`
      SELECT
        model,
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE success = true)::bigint as successes,
        AVG("totalDurationMs") as avg_duration,
        SUM("inputTokens")::bigint as total_input_tokens,
        SUM("outputTokens")::bigint as total_output_tokens,
        SUM("cachedTokens")::bigint as total_cached_tokens
      FROM "GenerationAttempt"
      WHERE "createdAt" >= ${last7d}
      GROUP BY model
      ORDER BY total DESC
    `,
  );
  if (modelComparisonResult.error) {
    console.error(
      "Failed to fetch model comparison:",
      modelComparisonResult.error,
    );
  }

  // Calculate costs per model
  const modelComparison = (modelComparisonResult.data ?? []).map((row) => {
    const cost = calculateTokenCost({
      model: row.model,
      inputTokens: Number(row.total_input_tokens ?? 0),
      outputTokens: Number(row.total_output_tokens ?? 0),
      cachedTokens: Number(row.total_cached_tokens ?? 0),
    });

    return {
      model: row.model,
      total: Number(row.total),
      successes: Number(row.successes),
      successRate:
        Number(row.total) > 0
          ? Math.round(
            (Number(row.successes) / Number(row.total)) * 100 * 100,
          ) / 100
          : 0,
      avgDurationMs: Math.round(Number(row.avg_duration ?? 0)),
      totalCost: Math.round(cost.totalCost * 10000) / 10000,
    };
  });

  const totalCost = modelComparison.reduce((sum, m) => sum + m.totalCost, 0);

  // Active notes count
  const activeNotesResult = await tryCatch(
    prisma.agentLearningNote.count({
      where: { status: { in: ["ACTIVE", "CANDIDATE"] } },
    }),
  );
  if (activeNotesResult.error) {
    console.error(
      "Failed to fetch active notes count:",
      activeNotesResult.error,
    );
  }

  const sr24h = successRate24hResult.data?.[0];
  const sr7d = successRate7dResult.data?.[0];
  const latency = latencyResult.data?.[0];

  return NextResponse.json({
    successRate: {
      last24h: {
        total: Number(sr24h?.total ?? 0),
        successes: Number(sr24h?.successes ?? 0),
        rate:
          Number(sr24h?.total ?? 0) > 0
            ? Math.round(
              (Number(sr24h?.successes ?? 0) / Number(sr24h?.total ?? 1)) *
                100 *
                100,
            ) / 100
            : 0,
      },
      last7d: {
        total: Number(sr7d?.total ?? 0),
        successes: Number(sr7d?.successes ?? 0),
        rate:
          Number(sr7d?.total ?? 0) > 0
            ? Math.round(
              (Number(sr7d?.successes ?? 0) / Number(sr7d?.total ?? 1)) *
                100 *
                100,
            ) / 100
            : 0,
      },
    },
    latency: {
      p50: Math.round(Number(latency?.p50 ?? 0)),
      p75: Math.round(Number(latency?.p75 ?? 0)),
      p95: Math.round(Number(latency?.p95 ?? 0)),
    },
    iterationsHistogram: (iterationsResult.data ?? []).map((row) => ({
      iterations: row.iterations,
      count: Number(row.count),
    })),
    modelComparison,
    totalCost: Math.round(totalCost * 10000) / 10000,
    activeNotes: activeNotesResult.data ?? 0,
  });
}
