/**
 * Account Health Dashboard API
 *
 * GET /api/orbit/[workspaceSlug]/accounts/health/dashboard - Get aggregated health dashboard data
 *
 * Resolves #586: Implement Account Health Monitor
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getAccountsNeedingSync,
  getAccountsWithSyncIssues,
  getOrCreateHealth,
  getRecentHealthEvents,
  scoreToStatus,
} from "@/lib/health-monitor";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/accounts/health/dashboard - Get dashboard data
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
    }),
  );

  if (accountsError) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  // Ensure all accounts have health records
  const accountsWithHealth = await Promise.all(
    (accounts || []).map(async (account) => {
      const health = account.health || (await getOrCreateHealth(account.id));
      return { ...account, health };
    }),
  );

  // Calculate overall health metrics
  const healthScores = accountsWithHealth.map((a) => a.health.healthScore);
  const overallHealthScore = healthScores.length > 0
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : 100;

  // Group accounts by status
  const statusDistribution = {
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    critical: 0,
  };

  for (const account of accountsWithHealth) {
    const status = scoreToStatus(account.health.healthScore);
    switch (status) {
      case "HEALTHY":
        statusDistribution.healthy++;
        break;
      case "DEGRADED":
        statusDistribution.degraded++;
        break;
      case "UNHEALTHY":
        statusDistribution.unhealthy++;
        break;
      case "CRITICAL":
        statusDistribution.critical++;
        break;
    }
  }

  // Group by platform
  const platformHealth: Record<
    string,
    {
      count: number;
      avgScore: number;
      accounts: Array<{ id: string; name: string; score: number; }>;
    }
  > = {};

  for (const account of accountsWithHealth) {
    if (!platformHealth[account.platform]) {
      platformHealth[account.platform] = { count: 0, avgScore: 0, accounts: [] };
    }
    const platform = platformHealth[account.platform]!;
    platform.count++;
    platform.accounts.push({
      id: account.id,
      name: account.accountName,
      score: account.health.healthScore,
    });
  }

  // Calculate average scores per platform
  for (const platform of Object.keys(platformHealth)) {
    const platformData = platformHealth[platform]!;
    platformData.avgScore = Math.round(
      platformData.accounts.reduce((sum, a) => sum + a.score, 0) / platformData.count,
    );
  }

  // Get accounts needing attention
  const syncIssues = await getAccountsWithSyncIssues(workspace.id);
  const needingSync = await getAccountsNeedingSync(workspace.id);

  // Get accounts with rate limit warnings
  const rateLimitedAccounts = accountsWithHealth.filter(
    (a) =>
      a.health.isRateLimited ||
      (a.health.rateLimitRemaining !== null &&
        a.health.rateLimitTotal !== null &&
        a.health.rateLimitRemaining / a.health.rateLimitTotal < 0.2),
  );

  // Get accounts with expiring tokens
  const expiringTokenAccounts = accountsWithHealth.filter(
    (a) =>
      a.health.tokenExpiresAt &&
      new Date(a.health.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000,
  );

  // Get recent events
  const recentEvents = await getRecentHealthEvents(workspace.id, 10);

  // Build critical issues list
  const criticalIssues: Array<{
    accountId: string;
    accountName: string;
    platform: string;
    issue: string;
    severity: string;
  }> = [];

  for (const account of accountsWithHealth) {
    if (account.health.healthScore < 50) {
      criticalIssues.push({
        accountId: account.id,
        accountName: account.accountName,
        platform: account.platform,
        issue: account.health.healthScore < 20
          ? "Critical health score"
          : "Low health score",
        severity: account.health.healthScore < 20 ? "CRITICAL" : "WARNING",
      });
    }

    if (account.health.isRateLimited) {
      criticalIssues.push({
        accountId: account.id,
        accountName: account.accountName,
        platform: account.platform,
        issue: "Currently rate limited",
        severity: "WARNING",
      });
    }

    if (account.health.tokenRefreshRequired) {
      criticalIssues.push({
        accountId: account.id,
        accountName: account.accountName,
        platform: account.platform,
        issue: "Token refresh required",
        severity: "ERROR",
      });
    }

    if (account.health.consecutiveErrors >= 5) {
      criticalIssues.push({
        accountId: account.id,
        accountName: account.accountName,
        platform: account.platform,
        issue: `${account.health.consecutiveErrors} consecutive sync errors`,
        severity: "ERROR",
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = {
    CRITICAL: 3,
    ERROR: 2,
    WARNING: 1,
    INFO: 0,
  };
  criticalIssues.sort(
    (a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0),
  );

  return NextResponse.json({
    overview: {
      totalAccounts: accountsWithHealth.length,
      overallHealthScore,
      overallStatus: scoreToStatus(overallHealthScore),
      statusDistribution,
    },
    platforms: platformHealth,
    issues: {
      critical: criticalIssues.slice(0, 10),
      syncIssues: syncIssues.length,
      needingSync: needingSync.length,
      rateLimited: rateLimitedAccounts.length,
      expiringTokens: expiringTokenAccounts.length,
    },
    recentEvents,
    lastUpdated: new Date().toISOString(),
  });
}
