import prisma from "@/lib/prisma";
import type {
  DateRange,
  ReportData,
  WorkspaceReportData,
  WorkspaceMetrics,
  AggregateMetrics,
  PostSummary,
} from "@/types/workspace-reports";
import type { ReportFormat } from "@prisma/client";

/**
 * Generate report data for the given workspaces and date range
 */
export async function generateReportData(
  workspaceIds: string[],
  dateRange: DateRange,
  metrics: string[]
): Promise<ReportData> {
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  // Fetch data for all workspaces in parallel
  const workspaceDataPromises = workspaceIds.map((workspaceId) =>
    generateWorkspaceData(workspaceId, startDate, endDate, metrics)
  );

  const workspaceData = await Promise.all(workspaceDataPromises);

  // Calculate aggregates
  const aggregates = calculateAggregates(workspaceData);

  return {
    workspaces: workspaceData,
    aggregates,
    period: dateRange,
  };
}

/**
 * Generate data for a single workspace
 */
async function generateWorkspaceData(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  metrics: string[]
): Promise<WorkspaceReportData> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const workspaceMetrics = await calculateWorkspaceMetrics(
    workspaceId,
    startDate,
    endDate,
    metrics
  );

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    metrics: workspaceMetrics,
  };
}

/**
 * Calculate metrics for a single workspace
 */
async function calculateWorkspaceMetrics(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  _metrics: string[]
): Promise<WorkspaceMetrics> {
  // Fetch counts in parallel
  const [
    socialAccountCount,
    scheduledPostCount,
    publishedPostCount,
    draftCount,
    topPosts,
  ] = await Promise.all([
    // Social account count
    prisma.socialAccount.count({
      where: { workspaceId },
    }),

    // Scheduled post count
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "SCHEDULED",
      },
    }),

    // Published post count
    prisma.scheduledPost.count({
      where: {
        workspaceId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "PUBLISHED",
      },
    }),

    // Draft count (Relay drafts model has different structure)
    prisma.relayDraft.count({
      where: {
        inboxItem: {
          workspaceId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Top performing posts (simplified - just get recent published posts)
    prisma.scheduledPost.findMany({
      where: {
        workspaceId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        content: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 5,
    }),
  ]);

  // Placeholder metrics (real metrics would come from social platform APIs)
  const totalEngagements = 0;
  const totalReach = 0;
  const totalImpressions = 0;
  const totalFollowers = 0;

  const postSummaries: PostSummary[] = topPosts.map((post) => {
    return {
      id: post.id,
      content: post.content,
      platform: "social", // Placeholder
      publishedAt: post.publishedAt!,
      engagements: 0, // Would come from social API
      reach: 0,
      impressions: 0,
    };
  });

  const avgEngagementRate = 0;

  return {
    socialAccountCount,
    scheduledPostCount,
    publishedPostCount,
    draftCount,
    totalEngagements,
    totalFollowers,
    totalImpressions,
    totalReach,
    avgEngagementRate,
    topPerformingPosts: postSummaries,
  };
}

/**
 * Calculate aggregate metrics across all workspaces
 */
function calculateAggregates(
  workspaceData: WorkspaceReportData[]
): AggregateMetrics {
  let totalSocialAccounts = 0;
  let totalScheduledPosts = 0;
  let totalPublishedPosts = 0;
  let totalDrafts = 0;
  let totalEngagements = 0;
  let totalFollowers = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalEngagementRates = 0;

  for (const workspace of workspaceData) {
    totalSocialAccounts += workspace.metrics.socialAccountCount;
    totalScheduledPosts += workspace.metrics.scheduledPostCount;
    totalPublishedPosts += workspace.metrics.publishedPostCount;
    totalDrafts += workspace.metrics.draftCount;
    totalEngagements += workspace.metrics.totalEngagements;
    totalFollowers += workspace.metrics.totalFollowers;
    totalImpressions += workspace.metrics.totalImpressions;
    totalReach += workspace.metrics.totalReach;
    totalEngagementRates += workspace.metrics.avgEngagementRate;
  }

  const avgEngagementRate =
    workspaceData.length > 0 ? totalEngagementRates / workspaceData.length : 0;

  return {
    totalWorkspaces: workspaceData.length,
    totalSocialAccounts,
    totalScheduledPosts,
    totalPublishedPosts,
    totalDrafts,
    totalEngagements,
    totalFollowers,
    totalImpressions,
    totalReach,
    avgEngagementRate,
  };
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: ReportData): string {
  const lines: string[] = [];

  // Header
  lines.push("Workspace,Metric,Value");

  // Workspace data
  for (const workspace of data.workspaces) {
    lines.push(
      `${workspace.workspaceName},Social Accounts,${workspace.metrics.socialAccountCount}`
    );
    lines.push(
      `${workspace.workspaceName},Scheduled Posts,${workspace.metrics.scheduledPostCount}`
    );
    lines.push(
      `${workspace.workspaceName},Published Posts,${workspace.metrics.publishedPostCount}`
    );
    lines.push(
      `${workspace.workspaceName},Drafts,${workspace.metrics.draftCount}`
    );
    lines.push(
      `${workspace.workspaceName},Total Engagements,${workspace.metrics.totalEngagements}`
    );
    lines.push(
      `${workspace.workspaceName},Total Followers,${workspace.metrics.totalFollowers}`
    );
    lines.push(
      `${workspace.workspaceName},Total Impressions,${workspace.metrics.totalImpressions}`
    );
    lines.push(
      `${workspace.workspaceName},Total Reach,${workspace.metrics.totalReach}`
    );
    lines.push(
      `${workspace.workspaceName},Avg Engagement Rate,${workspace.metrics.avgEngagementRate.toFixed(2)}%`
    );
  }

  // Aggregates
  lines.push("");
  lines.push("Aggregate Metrics");
  lines.push(`Total Workspaces,${data.aggregates.totalWorkspaces}`);
  lines.push(
    `Total Social Accounts,${data.aggregates.totalSocialAccounts}`
  );
  lines.push(
    `Total Scheduled Posts,${data.aggregates.totalScheduledPosts}`
  );
  lines.push(
    `Total Published Posts,${data.aggregates.totalPublishedPosts}`
  );
  lines.push(`Total Drafts,${data.aggregates.totalDrafts}`);
  lines.push(`Total Engagements,${data.aggregates.totalEngagements}`);
  lines.push(`Total Followers,${data.aggregates.totalFollowers}`);
  lines.push(`Total Impressions,${data.aggregates.totalImpressions}`);
  lines.push(`Total Reach,${data.aggregates.totalReach}`);
  lines.push(
    `Avg Engagement Rate,${data.aggregates.avgEngagementRate.toFixed(2)}%`
  );

  return lines.join("\n");
}

/**
 * Format report data based on the specified format
 */
export function formatReportData(
  data: ReportData,
  format: ReportFormat
): string {
  switch (format) {
    case "CSV":
      return exportToCSV(data);
    case "JSON":
      return JSON.stringify(data, null, 2);
    case "PDF":
      // PDF generation would require a library like puppeteer or pdfkit
      // For now, return a JSON representation
      return JSON.stringify(data, null, 2);
    default:
      return JSON.stringify(data, null, 2);
  }
}
