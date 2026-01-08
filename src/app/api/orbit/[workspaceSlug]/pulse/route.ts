/**
 * Pulse Dashboard API
 *
 * Provides aggregated health metrics, platform status, and trends
 * for the Pulse dashboard widget.
 *
 * Resolves #649
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getRecentAnomalies, getWorkspaceHealth } from "@/lib/social/anomaly-detection";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/pulse
 *
 * Returns aggregated Pulse dashboard data including:
 * - Overall health status
 * - Platform-level status
 * - Recent anomalies
 * - 7-day trend data
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug
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
        name: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Fetch all data in parallel
  const [healthResult, anomaliesResult, platformStatusResult, trendsResult] = await Promise.all([
    getWorkspaceHealth(workspace.id),
    getRecentAnomalies(workspace.id, 10),
    getPlatformStatus(workspace.id),
    getTrendData(workspace.id),
  ]);

  return NextResponse.json({
    health: healthResult,
    anomalies: anomaliesResult.map((a) => ({
      ...a,
      detectedAt: a.detectedAt.toISOString(),
    })),
    platforms: platformStatusResult,
    trends: trendsResult,
    workspaceName: workspace.name,
  });
}

/**
 * Get status for each connected platform
 */
async function getPlatformStatus(workspaceId: string) {
  const { data: accounts, error } = await tryCatch(
    prisma.socialAccount.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        platform: true,
        accountName: true,
        updatedAt: true,
        metrics: {
          orderBy: { date: "desc" },
          take: 2,
          select: {
            followers: true,
            date: true,
          },
        },
      },
    }),
  );

  if (error || !accounts) {
    return [];
  }

  // Get recent anomalies grouped by account
  const { data: anomalies } = await tryCatch(
    prisma.socialMetricAnomaly.findMany({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        detectedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        accountId: true,
        severity: true,
      },
    }),
  );

  const anomalyMap = new Map<string, { critical: number; warning: number; }>();
  for (const anomaly of anomalies ?? []) {
    const current = anomalyMap.get(anomaly.accountId) ?? {
      critical: 0,
      warning: 0,
    };
    if (anomaly.severity === "critical") {
      current.critical++;
    } else {
      current.warning++;
    }
    anomalyMap.set(anomaly.accountId, current);
  }

  return accounts.map((account) => {
    const currentFollowers = account.metrics[0]?.followers ?? 0;
    const previousFollowers = account.metrics[1]?.followers ?? currentFollowers;
    const followerChange = previousFollowers > 0
      ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
      : 0;

    const accountAnomalies = anomalyMap.get(account.id) ?? {
      critical: 0,
      warning: 0,
    };
    const status = accountAnomalies.critical > 0
      ? "critical"
      : accountAnomalies.warning > 0
      ? "warning"
      : "healthy";

    return {
      platform: account.platform,
      accountName: account.accountName,
      status,
      followerCount: currentFollowers,
      followerChange,
      lastUpdated: account.updatedAt.toISOString(),
    };
  });
}

/**
 * Get 7-day trend data for the workspace
 */
async function getTrendData(workspaceId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: metrics, error } = await tryCatch(
    prisma.socialMetrics.findMany({
      where: {
        account: {
          workspaceId,
          status: "ACTIVE",
        },
        date: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        date: true,
        followers: true,
        impressions: true,
        reach: true,
        engagementRate: true,
      },
      orderBy: { date: "asc" },
    }),
  );

  if (error || !metrics || metrics.length === 0) {
    return [];
  }

  // Aggregate metrics by date
  const dateMap = new Map<
    string,
    {
      followers: number;
      impressions: number;
      reach: number;
      engagement: number;
      count: number;
    }
  >();

  for (const m of metrics) {
    const dateKey = m.date.toISOString().split("T")[0]!;
    const current = dateMap.get(dateKey) ?? {
      followers: 0,
      impressions: 0,
      reach: 0,
      engagement: 0,
      count: 0,
    };

    current.followers += m.followers;
    current.impressions += m.impressions;
    current.reach += m.reach;
    current.engagement += m.engagementRate?.toNumber() ?? 0;
    current.count++;

    dateMap.set(dateKey, current);
  }

  // Convert to array and calculate averages
  const trendData = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      followers: data.followers,
      impressions: data.impressions,
      reach: data.reach,
      engagement: data.count > 0 ? data.engagement / data.count : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trendData;
}
