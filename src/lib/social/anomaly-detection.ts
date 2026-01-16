/**
 * Pulse Anomaly Detection
 *
 * Detects anomalies in social media metrics using Z-score analysis
 * against a 7-day moving average baseline.
 *
 * Resolves #647
 */

import type { SocialMetrics, SocialPlatform } from "@prisma/client";

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

/**
 * Configuration for anomaly detection
 */
export interface AnomalyConfig {
  /**
   * Number of days to use for moving average calculation
   * @default 7
   */
  windowSize?: number;

  /**
   * Z-score threshold for triggering a warning (95% confidence)
   * @default 2.0
   */
  warningThreshold?: number;

  /**
   * Z-score threshold for triggering a critical alert (99.7% confidence)
   * @default 3.0
   */
  criticalThreshold?: number;
}

/**
 * Types of metrics we analyze for anomalies
 */
export type MetricType =
  | "followers"
  | "following"
  | "postsCount"
  | "engagementRate"
  | "impressions"
  | "reach";

/**
 * Severity levels for detected anomalies
 */
export type AnomalySeverity = "warning" | "critical";

/**
 * Direction of the anomaly
 */
export type AnomalyDirection = "spike" | "drop";

/**
 * Result of detecting an anomaly for a single metric
 */
export interface AnomalyResult {
  accountId: string;
  platform: SocialPlatform;
  metricType: MetricType;
  currentValue: number;
  expectedValue: number;
  zScore: number;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
  percentChange: number;
  detectedAt: Date;
}

/**
 * Result of analyzing all metrics for a workspace
 */
export interface AnomalyAnalysisResult {
  workspaceId: string;
  analyzedAccounts: number;
  anomalies: AnomalyResult[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

/**
 * Calculate the mean of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate the Z-score for a value given the mean and standard deviation
 */
export function calculateZScore(
  value: number,
  mean: number,
  stdDev: number,
): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate the moving average for a series of values
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number,
): number[] {
  if (values.length < windowSize) return [];

  const result: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    result.push(calculateMean(window));
  }
  return result;
}

/**
 * Metrics we analyze for anomalies
 */
const ANALYZED_METRICS: MetricType[] = [
  "followers",
  "following",
  "postsCount",
  "impressions",
  "reach",
];

/**
 * Extract a specific metric value from a SocialMetrics record
 */
function extractMetricValue(
  metrics: SocialMetrics,
  metricType: MetricType,
): number {
  switch (metricType) {
    case "followers":
      return metrics.followers;
    case "following":
      return metrics.following;
    case "postsCount":
      return metrics.postsCount;
    case "engagementRate":
      return metrics.engagementRate?.toNumber() ?? 0;
    case "impressions":
      return metrics.impressions;
    case "reach":
      return metrics.reach;
    default:
      return 0;
  }
}

/**
 * Detect anomalies in a single metric series
 */
function detectMetricAnomalies(
  accountId: string,
  platform: SocialPlatform,
  metricType: MetricType,
  values: number[],
  config: Required<AnomalyConfig>,
): AnomalyResult | null {
  const { windowSize, warningThreshold, criticalThreshold } = config;

  // Need at least windowSize + 1 data points to detect anomalies
  if (values.length < windowSize + 1) {
    return null;
  }

  // Use all but the last value for baseline calculation
  const historicalValues = values.slice(0, -1);
  const currentValue = values[values.length - 1]!;

  // Calculate baseline statistics
  const mean = calculateMean(historicalValues);
  const stdDev = calculateStandardDeviation(historicalValues);

  // Calculate Z-score for current value
  const zScore = calculateZScore(currentValue, mean, stdDev);
  const absZScore = Math.abs(zScore);

  // Check if this is an anomaly
  if (absZScore < warningThreshold) {
    return null;
  }

  const severity: AnomalySeverity = absZScore >= criticalThreshold
    ? "critical"
    : "warning";
  const direction: AnomalyDirection = zScore > 0 ? "spike" : "drop";
  const percentChange = mean !== 0 ? ((currentValue - mean) / mean) * 100 : 0;

  return {
    accountId,
    platform,
    metricType,
    currentValue,
    expectedValue: mean,
    zScore,
    severity,
    direction,
    percentChange,
    detectedAt: new Date(),
  };
}

/**
 * Analyze metrics for a single account and detect anomalies
 */
async function analyzeAccountMetrics(
  accountId: string,
  platform: SocialPlatform,
  config: Required<AnomalyConfig>,
): Promise<AnomalyResult[]> {
  const { windowSize } = config;

  // Fetch historical metrics for the account
  const { data: metrics, error } = await tryCatch(
    prisma.socialMetrics.findMany({
      where: { accountId },
      orderBy: { date: "asc" },
      take: windowSize + 1, // Need windowSize days of history + current day
    }),
  );

  if (error || !metrics || metrics.length < 2) {
    return [];
  }

  const anomalies: AnomalyResult[] = [];

  // Check each metric type for anomalies
  for (const metricType of ANALYZED_METRICS) {
    const values = metrics.map((m) => extractMetricValue(m, metricType));

    // Skip if all values are zero
    if (values.every((v) => v === 0)) {
      continue;
    }

    const anomaly = detectMetricAnomalies(
      accountId,
      platform,
      metricType,
      values,
      config,
    );

    if (anomaly) {
      anomalies.push(anomaly);
    }
  }

  return anomalies;
}

/**
 * Detect anomalies across all social accounts in a workspace
 *
 * @param workspaceId - The workspace to analyze
 * @param config - Anomaly detection configuration
 * @returns Analysis result with detected anomalies
 */
export async function detectAnomalies(
  workspaceId: string,
  config: AnomalyConfig = {},
): Promise<AnomalyAnalysisResult> {
  const startedAt = new Date();

  // Apply default config values
  const fullConfig: Required<AnomalyConfig> = {
    windowSize: config.windowSize ?? 7,
    warningThreshold: config.warningThreshold ?? 2.0,
    criticalThreshold: config.criticalThreshold ?? 3.0,
  };

  // Fetch all active accounts for the workspace
  const { data: accounts, error } = await tryCatch(
    prisma.socialAccount.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        platform: true,
      },
    }),
  );

  if (error || !accounts) {
    const completedAt = new Date();
    return {
      workspaceId,
      analyzedAccounts: 0,
      anomalies: [],
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  // Analyze each account
  const allAnomalies: AnomalyResult[] = [];

  for (const account of accounts) {
    const anomalies = await analyzeAccountMetrics(
      account.id,
      account.platform,
      fullConfig,
    );
    allAnomalies.push(...anomalies);
  }

  const completedAt = new Date();

  return {
    workspaceId,
    analyzedAccounts: accounts.length,
    anomalies: allAnomalies,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}

/**
 * Store a detected anomaly in the database
 */
export async function storeAnomaly(anomaly: AnomalyResult): Promise<void> {
  await prisma.socialMetricAnomaly.create({
    data: {
      accountId: anomaly.accountId,
      metricType: anomaly.metricType,
      detectedAt: anomaly.detectedAt,
      currentValue: anomaly.currentValue,
      expectedValue: anomaly.expectedValue,
      zScore: anomaly.zScore,
      severity: anomaly.severity,
      direction: anomaly.direction,
      percentChange: anomaly.percentChange,
    },
  });
}

/**
 * Get recent anomalies for a workspace
 *
 * @param workspaceId - The workspace to fetch anomalies for
 * @param limit - Maximum number of anomalies to return
 * @returns Array of recent anomalies
 */
export async function getRecentAnomalies(
  workspaceId: string,
  limit: number = 10,
): Promise<AnomalyResult[]> {
  const { data: anomalies, error } = await tryCatch(
    prisma.socialMetricAnomaly.findMany({
      where: {
        account: {
          workspaceId,
        },
      },
      orderBy: { detectedAt: "desc" },
      take: limit,
      include: {
        account: {
          select: {
            platform: true,
          },
        },
      },
    }),
  );

  if (error || !anomalies) {
    return [];
  }

  return anomalies.map((a) => ({
    accountId: a.accountId,
    platform: a.account.platform,
    metricType: a.metricType as MetricType,
    currentValue: a.currentValue,
    expectedValue: a.expectedValue,
    zScore: a.zScore,
    severity: a.severity as AnomalySeverity,
    direction: a.direction as AnomalyDirection,
    percentChange: a.percentChange,
    detectedAt: a.detectedAt,
  }));
}

/**
 * Calculate workspace health status based on recent anomalies
 */
export type HealthStatus = "healthy" | "warning" | "critical";

export interface WorkspaceHealthResult {
  status: HealthStatus;
  criticalCount: number;
  warningCount: number;
  lastChecked: Date;
}

/**
 * Get the health status for a workspace based on recent anomalies
 *
 * @param workspaceId - The workspace to check
 * @returns Health status with counts
 */
export async function getWorkspaceHealth(
  workspaceId: string,
): Promise<WorkspaceHealthResult> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: anomalies, error } = await tryCatch(
    prisma.socialMetricAnomaly.findMany({
      where: {
        account: {
          workspaceId,
        },
        detectedAt: {
          gte: oneDayAgo,
        },
      },
      select: {
        severity: true,
      },
    }),
  );

  if (error || !anomalies) {
    return {
      status: "healthy",
      criticalCount: 0,
      warningCount: 0,
      lastChecked: now,
    };
  }

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  let status: HealthStatus;
  if (criticalCount > 0) {
    status = "critical";
  } else if (warningCount > 0) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    status,
    criticalCount,
    warningCount,
    lastChecked: now,
  };
}
