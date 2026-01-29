import type { ReportSchedule, ReportFormat } from "@prisma/client";

/**
 * Workspace Report
 */
export interface WorkspaceReport {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  workspaceIds: string[];
  metrics: string[];
  dateRange: DateRange | null;
  schedule: ReportSchedule;
  scheduleFrequency: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workspace Report Instance
 */
export interface WorkspaceReportInstance {
  id: string;
  reportId: string;
  data: ReportData;
  format: ReportFormat;
  fileUrl: string | null;
  generatedAt: Date;
  period: DateRange;
}

/**
 * Date range for reports
 */
export interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

/**
 * Report data structure
 */
export interface ReportData {
  workspaces: WorkspaceReportData[];
  aggregates: AggregateMetrics;
  period: DateRange;
}

/**
 * Per-workspace report data
 */
export interface WorkspaceReportData {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  metrics: WorkspaceMetrics;
}

/**
 * Workspace metrics
 */
export interface WorkspaceMetrics {
  socialAccountCount: number;
  scheduledPostCount: number;
  publishedPostCount: number;
  draftCount: number;
  totalEngagements: number;
  totalFollowers: number;
  totalImpressions: number;
  totalReach: number;
  avgEngagementRate: number;
  topPerformingPosts: PostSummary[];
}

/**
 * Post summary for reports
 */
export interface PostSummary {
  id: string;
  content: string;
  platform: string;
  publishedAt: Date;
  engagements: number;
  reach: number;
  impressions: number;
}

/**
 * Aggregate metrics across workspaces
 */
export interface AggregateMetrics {
  totalWorkspaces: number;
  totalSocialAccounts: number;
  totalScheduledPosts: number;
  totalPublishedPosts: number;
  totalDrafts: number;
  totalEngagements: number;
  totalFollowers: number;
  totalImpressions: number;
  totalReach: number;
  avgEngagementRate: number;
}

/**
 * Request to create a report
 */
export interface CreateReportRequest {
  name: string;
  description?: string;
  workspaceIds: string[];
  metrics: string[];
  dateRange?: DateRange;
  schedule?: ReportSchedule;
  scheduleFrequency?: string;
}

/**
 * Request to update a report
 */
export interface UpdateReportRequest {
  name?: string;
  description?: string;
  workspaceIds?: string[];
  metrics?: string[];
  dateRange?: DateRange;
  schedule?: ReportSchedule;
  scheduleFrequency?: string;
}

/**
 * Request to generate a report
 */
export interface GenerateReportRequest {
  format?: ReportFormat;
  dateRange?: DateRange;
}

/**
 * API response for report list
 */
export interface ReportsApiResponse {
  reports: WorkspaceReport[];
  total: number;
}

/**
 * API response for report instance list
 */
export interface ReportInstancesApiResponse {
  instances: WorkspaceReportInstance[];
  total: number;
}

/**
 * Export format options
 */
export const REPORT_FORMATS = {
  JSON: "JSON",
  CSV: "CSV",
  PDF: "PDF",
} as const;

/**
 * Available metric keys
 */
export const AVAILABLE_METRICS = [
  "socialAccountCount",
  "scheduledPostCount",
  "publishedPostCount",
  "draftCount",
  "totalEngagements",
  "totalFollowers",
  "totalImpressions",
  "totalReach",
  "avgEngagementRate",
] as const;

export type MetricKey = (typeof AVAILABLE_METRICS)[number];
