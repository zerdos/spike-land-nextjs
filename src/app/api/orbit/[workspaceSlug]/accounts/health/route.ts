/**
 * Account Health API
 *
 * GET /api/orbit/[workspaceSlug]/accounts/health - Get health summary for all accounts
 *
 * Resolves #586: Implement Account Health Monitor
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { type AccountHealthSummary, getOrCreateHealth, scoreToStatus } from "@/lib/health-monitor";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/accounts/health - Get health summary for all accounts
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Get all accounts with health data
  const { data: accounts, error: accountsError } = await tryCatch(
    prisma.socialAccount.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: "DISCONNECTED" },
      },
      include: {
        health: true,
      },
      orderBy: [
        { health: { healthScore: "asc" } }, // Unhealthiest first
        { accountName: "asc" },
      ],
    }),
  );

  if (accountsError) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  // Build health summaries
  const summaries: AccountHealthSummary[] = [];

  for (const account of accounts || []) {
    // Ensure health record exists
    const health = account.health || (await getOrCreateHealth(account.id));

    summaries.push({
      accountId: account.id,
      platform: account.platform,
      accountName: account.accountName,
      healthScore: health.healthScore,
      status: scoreToStatus(health.healthScore),
      issues: [], // Populated by client if needed
      lastSync: health.lastSuccessfulSync,
      rateLimitUsage: health.rateLimitRemaining !== null && health.rateLimitTotal !== null
        ? {
          remaining: health.rateLimitRemaining,
          total: health.rateLimitTotal,
          resetAt: health.rateLimitResetAt || new Date(),
          percentUsed: health.rateLimitTotal > 0
            ? ((health.rateLimitTotal - health.rateLimitRemaining) /
              health.rateLimitTotal) *
              100
            : 0,
        }
        : null,
      tokenExpiresAt: health.tokenExpiresAt,
      consecutiveErrors: health.consecutiveErrors,
    });
  }

  // Calculate aggregate stats
  const stats = {
    totalAccounts: summaries.length,
    healthyAccounts: summaries.filter((s) => s.status === "HEALTHY").length,
    degradedAccounts: summaries.filter((s) => s.status === "DEGRADED").length,
    unhealthyAccounts: summaries.filter((s) => s.status === "UNHEALTHY").length,
    criticalAccounts: summaries.filter((s) => s.status === "CRITICAL").length,
    averageHealthScore: summaries.length > 0
      ? Math.round(
        summaries.reduce((sum, s) => sum + s.healthScore, 0) /
          summaries.length,
      )
      : 100,
    accountsWithRateLimits: summaries.filter(
      (s) => s.rateLimitUsage && s.rateLimitUsage.percentUsed > 80,
    ).length,
    accountsWithExpiringTokens: summaries.filter(
      (s) =>
        s.tokenExpiresAt &&
        new Date(s.tokenExpiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000,
    ).length,
  };

  return NextResponse.json({
    accounts: summaries,
    stats,
  });
}
