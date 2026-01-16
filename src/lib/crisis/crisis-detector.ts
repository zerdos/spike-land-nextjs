/**
 * Crisis Detector
 *
 * Detects crisis situations based on configurable rules and thresholds.
 * Uses statistical analysis (Z-score) and sentiment analysis.
 *
 * Resolves #588: Create Crisis Detection System
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type {
  CrisisAlertRule,
  CrisisDetectionEvent,
  CrisisEventStatus,
  CrisisSeverity,
  Prisma,
} from "@prisma/client";

import type {
  AlertRuleConditions,
  CreateAlertRuleOptions,
  CreateCrisisEventOptions,
  CrisisDetectionResult,
  CrisisEventSearchParams,
  CrisisEventWithDetails,
  CrisisMetrics,
  CrisisTriggerData,
  PaginatedResponse,
  SentimentAnalysisResult,
  UpdateAlertRuleOptions,
} from "./types";

/**
 * Crisis Detector
 *
 * Main service for detecting, creating, and managing crisis events.
 */
export class CrisisDetector {
  // ==========================================================================
  // Crisis Event Management
  // ==========================================================================

  /**
   * Create a new crisis event
   */
  static async createEvent(
    options: CreateCrisisEventOptions,
  ): Promise<CrisisDetectionEvent | null> {
    const { data, error } = await tryCatch(
      prisma.crisisDetectionEvent.create({
        data: {
          workspaceId: options.workspaceId,
          severity: options.severity,
          status: "DETECTED",
          triggerType: options.triggerType,
          triggerData: options.triggerData as Prisma.JsonObject,
          affectedAccountIds: options.affectedAccountIds || [],
        },
      }),
    );

    if (error) {
      console.error("Failed to create crisis event:", error);
      return null;
    }

    return data;
  }

  /**
   * Get a crisis event by ID
   */
  static async getEventById(
    eventId: string,
    workspaceId?: string,
  ): Promise<CrisisEventWithDetails | null> {
    const where: Prisma.CrisisDetectionEventWhereInput = { id: eventId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const { data, error } = await tryCatch(
      prisma.crisisDetectionEvent.findFirst({
        where,
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          acknowledgedBy: {
            select: { id: true, name: true, email: true },
          },
          resolvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    );

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Search crisis events with filters
   */
  static async searchEvents(
    params: CrisisEventSearchParams,
  ): Promise<PaginatedResponse<CrisisEventWithDetails>> {
    const limit = Math.min(params.limit || 50, 1000);
    const offset = params.offset || 0;

    const where: Prisma.CrisisDetectionEventWhereInput = {};

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
    }

    if (params.severity && params.severity.length > 0) {
      where.severity = { in: params.severity };
    }

    if (params.status && params.status.length > 0) {
      where.status = { in: params.status };
    }

    if (params.triggerType && params.triggerType.length > 0) {
      where.triggerType = { in: params.triggerType };
    }

    if (params.startDate || params.endDate) {
      where.detectedAt = {};
      if (params.startDate) {
        where.detectedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.detectedAt.lte = params.endDate;
      }
    }

    const orderBy: Prisma.CrisisDetectionEventOrderByWithRelationInput = {};
    const sortBy = params.sortBy || "detectedAt";
    const sortOrder = params.sortOrder || "desc";
    orderBy[sortBy] = sortOrder;

    const [events, total] = await Promise.all([
      prisma.crisisDetectionEvent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          acknowledgedBy: {
            select: { id: true, name: true, email: true },
          },
          resolvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.crisisDetectionEvent.count({ where }),
    ]);

    return {
      data: events,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
    };
  }

  /**
   * Acknowledge a crisis event
   */
  static async acknowledgeEvent(
    eventId: string,
    userId: string,
    notes?: string,
  ): Promise<CrisisDetectionEvent | null> {
    const { data, error } = await tryCatch(
      prisma.crisisDetectionEvent.update({
        where: { id: eventId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          acknowledgedById: userId,
          responseNotes: notes,
        },
      }),
    );

    if (error) {
      console.error("Failed to acknowledge crisis event:", error);
      return null;
    }

    return data;
  }

  /**
   * Resolve a crisis event
   */
  static async resolveEvent(
    eventId: string,
    userId: string,
    notes?: string,
    markAsFalseAlarm = false,
  ): Promise<CrisisDetectionEvent | null> {
    const status: CrisisEventStatus = markAsFalseAlarm
      ? "FALSE_ALARM"
      : "RESOLVED";

    const { data, error } = await tryCatch(
      prisma.crisisDetectionEvent.update({
        where: { id: eventId },
        data: {
          status,
          resolvedAt: new Date(),
          resolvedById: userId,
          responseNotes: notes,
        },
      }),
    );

    if (error) {
      console.error("Failed to resolve crisis event:", error);
      return null;
    }

    return data;
  }

  /**
   * Get active crises for a workspace
   */
  static async getActiveCrises(
    workspaceId: string,
  ): Promise<CrisisDetectionEvent[]> {
    const { data, error } = await tryCatch(
      prisma.crisisDetectionEvent.findMany({
        where: {
          workspaceId,
          status: { in: ["DETECTED", "ACKNOWLEDGED"] },
        },
        orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
      }),
    );

    if (error) {
      return [];
    }

    return data;
  }

  // ==========================================================================
  // Alert Rule Management
  // ==========================================================================

  /**
   * Create a new alert rule
   */
  static async createRule(
    options: CreateAlertRuleOptions,
  ): Promise<CrisisAlertRule | null> {
    const { data, error } = await tryCatch(
      prisma.crisisAlertRule.create({
        data: {
          workspaceId: options.workspaceId,
          name: options.name,
          description: options.description,
          ruleType: options.ruleType,
          conditions: options.conditions as Prisma.JsonObject,
          severity: options.severity,
          notifyChannels: options.notifyChannels,
          escalateAfterMinutes: options.escalateAfterMinutes,
          isActive: options.isActive ?? true,
        },
      }),
    );

    if (error) {
      console.error("Failed to create crisis alert rule:", error);
      return null;
    }

    return data;
  }

  /**
   * Update an alert rule
   */
  static async updateRule(
    ruleId: string,
    options: UpdateAlertRuleOptions,
  ): Promise<CrisisAlertRule | null> {
    const { data, error } = await tryCatch(
      prisma.crisisAlertRule.update({
        where: { id: ruleId },
        data: {
          ...(options.name !== undefined && { name: options.name }),
          ...(options.description !== undefined && {
            description: options.description,
          }),
          ...(options.ruleType !== undefined && { ruleType: options.ruleType }),
          ...(options.conditions !== undefined && {
            conditions: options.conditions as Prisma.JsonObject,
          }),
          ...(options.severity !== undefined && { severity: options.severity }),
          ...(options.notifyChannels !== undefined && {
            notifyChannels: options.notifyChannels,
          }),
          ...(options.escalateAfterMinutes !== undefined && {
            escalateAfterMinutes: options.escalateAfterMinutes,
          }),
          ...(options.isActive !== undefined && { isActive: options.isActive }),
        },
      }),
    );

    if (error) {
      console.error("Failed to update crisis alert rule:", error);
      return null;
    }

    return data;
  }

  /**
   * Delete an alert rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const { error } = await tryCatch(
      prisma.crisisAlertRule.delete({
        where: { id: ruleId },
      }),
    );

    if (error) {
      console.error("Failed to delete crisis alert rule:", error);
      return false;
    }

    return true;
  }

  /**
   * Get alert rules for a workspace
   */
  static async getRules(
    workspaceId: string,
    activeOnly = true,
  ): Promise<CrisisAlertRule[]> {
    const where: Prisma.CrisisAlertRuleWhereInput = { workspaceId };
    if (activeOnly) {
      where.isActive = true;
    }

    const { data, error } = await tryCatch(
      prisma.crisisAlertRule.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
    );

    if (error) {
      return [];
    }

    return data;
  }

  /**
   * Get a rule by ID
   */
  static async getRuleById(ruleId: string): Promise<CrisisAlertRule | null> {
    const { data, error } = await tryCatch(
      prisma.crisisAlertRule.findUnique({
        where: { id: ruleId },
      }),
    );

    if (error) {
      return null;
    }

    return data;
  }

  // ==========================================================================
  // Crisis Detection Logic
  // ==========================================================================

  /**
   * Run crisis detection for a workspace
   */
  static async detectCrises(
    workspaceId: string,
  ): Promise<CrisisDetectionResult> {
    const result: CrisisDetectionResult = {
      detected: false,
      crises: [],
    };

    // Get active rules for the workspace
    const rules = await this.getRules(workspaceId, true);

    if (rules.length === 0) {
      return result;
    }

    // Get recent anomalies
    const recentAnomalies = await prisma.socialMetricAnomaly.findMany({
      where: {
        account: { workspaceId },
        detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      include: {
        account: { select: { id: true, platform: true, accountName: true } },
      },
    });

    // Check each rule against the data
    for (const rule of rules) {
      const conditions = rule.conditions as AlertRuleConditions;
      const matchResult = await this.checkRuleMatch(
        rule,
        conditions,
        recentAnomalies,
        workspaceId,
      );

      if (matchResult.matched) {
        result.detected = true;
        result.crises.push({
          severity: rule.severity,
          triggerType: rule.ruleType,
          triggerData: matchResult.triggerData,
          affectedAccountIds: matchResult.affectedAccountIds,
          ruleId: rule.id,
        });
      }
    }

    return result;
  }

  /**
   * Check if a rule matches current conditions
   */
  private static async checkRuleMatch(
    rule: CrisisAlertRule,
    conditions: AlertRuleConditions,
    anomalies: Array<{
      id: string;
      severity: string;
      metricType: string;
      percentChange: number;
      account: { id: string; platform: string; accountName: string; };
    }>,
    workspaceId: string,
  ): Promise<{
    matched: boolean;
    triggerData: CrisisTriggerData;
    affectedAccountIds: string[];
  }> {
    const triggerData: CrisisTriggerData = {
      source: "system",
      detectionRuleId: rule.id,
    };
    const affectedAccountIds: string[] = [];

    switch (rule.ruleType) {
      case "ENGAGEMENT_DROP": {
        // Check for critical engagement anomalies
        const engagementAnomalies = anomalies.filter(
          (a) =>
            a.severity === "critical" &&
            ["engagementRate", "impressions", "reach"].includes(a.metricType) &&
            a.percentChange <
              -(conditions.engagementDropPercent || 30),
        );

        if (engagementAnomalies.length > 0) {
          for (const anomaly of engagementAnomalies) {
            affectedAccountIds.push(anomaly.account.id);
          }
          triggerData.metricType = "engagement";
          triggerData.percentChange = Math.min(
            ...engagementAnomalies.map((a) => a.percentChange),
          );
          return { matched: true, triggerData, affectedAccountIds };
        }
        break;
      }

      case "FOLLOWER_DROP": {
        // Check for significant follower loss
        const followerAnomalies = anomalies.filter(
          (a) =>
            a.metricType === "followers" &&
            a.percentChange < -(conditions.followerDropPercent || 5),
        );

        if (followerAnomalies.length > 0) {
          for (const anomaly of followerAnomalies) {
            affectedAccountIds.push(anomaly.account.id);
          }
          triggerData.metricType = "followers";
          triggerData.percentChange = Math.min(
            ...followerAnomalies.map((a) => a.percentChange),
          );
          return { matched: true, triggerData, affectedAccountIds };
        }
        break;
      }

      case "SENTIMENT_THRESHOLD": {
        // Check inbox items for negative sentiment
        const sentimentResult = await this.analyzeSentimentFromInbox(
          workspaceId,
          conditions.timeWindowHours || 24,
        );

        if (
          sentimentResult.sentimentScore <
            (conditions.sentimentThreshold || -0.5)
        ) {
          triggerData.sentimentScore = sentimentResult.sentimentScore;
          triggerData.description = `${
            sentimentResult.negativeProportion * 100
          }% negative messages`;
          return { matched: true, triggerData, affectedAccountIds: [] };
        }
        break;
      }

      case "MENTION_SPIKE": {
        // This would require additional mention tracking
        // For now, use multiple critical anomalies as a proxy
        const criticalCount = anomalies.filter(
          (a) => a.severity === "critical",
        ).length;
        if (criticalCount >= (conditions.mentionMultiplier || 3)) {
          triggerData.description = `${criticalCount} critical anomalies detected`;
          for (
            const anomaly of anomalies.filter(
              (a) => a.severity === "critical",
            )
          ) {
            affectedAccountIds.push(anomaly.account.id);
          }
          return { matched: true, triggerData, affectedAccountIds };
        }
        break;
      }
    }

    return { matched: false, triggerData, affectedAccountIds: [] };
  }

  /**
   * Analyze sentiment from inbox items
   */
  static async analyzeSentimentFromInbox(
    workspaceId: string,
    timeWindowHours: number,
  ): Promise<SentimentAnalysisResult> {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const { data: messages, error } = await tryCatch(
      prisma.inboxItem.findMany({
        where: {
          workspaceId,
          receivedAt: { gte: since },
        },
        select: {
          id: true,
          content: true,
        },
      }),
    );

    if (error || !messages || messages.length === 0) {
      return {
        overallSentiment: "neutral",
        sentimentScore: 0,
        confidence: 0,
        messageCount: 0,
        negativeProportion: 0,
        criticalMessages: [],
      };
    }

    // Simple keyword-based sentiment analysis
    const negativeKeywords = [
      "terrible",
      "awful",
      "horrible",
      "worst",
      "hate",
      "angry",
      "furious",
      "disappointed",
      "frustrated",
      "upset",
      "unacceptable",
      "disgusted",
      "scam",
      "fraud",
      "rip-off",
      "waste",
      "broken",
      "failed",
      "useless",
    ];
    const positiveKeywords = [
      "great",
      "excellent",
      "amazing",
      "love",
      "wonderful",
      "fantastic",
      "perfect",
      "awesome",
      "best",
      "happy",
      "thank",
      "appreciate",
    ];

    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const criticalMessages: SentimentAnalysisResult["criticalMessages"] = [];

    for (const msg of messages) {
      const content = (msg.content || "").toLowerCase();
      const negativeCount = negativeKeywords.filter((k) => content.includes(k)).length;
      const positiveCount = positiveKeywords.filter((k) => content.includes(k)).length;

      if (negativeCount > positiveCount) {
        sentimentCounts.negative++;
        criticalMessages.push({
          id: msg.id,
          content: msg.content || "",
          sentimentScore: -1,
        });
      } else if (positiveCount > negativeCount) {
        sentimentCounts.positive++;
      } else {
        sentimentCounts.neutral++;
      }
    }

    const total = messages.length;
    const negativeProportion = sentimentCounts.negative / total;
    const sentimentScore = (sentimentCounts.positive - sentimentCounts.negative) / total;

    let overallSentiment: SentimentAnalysisResult["overallSentiment"];
    if (sentimentScore > 0.3) {
      overallSentiment = "positive";
    } else if (sentimentScore < -0.3) {
      overallSentiment = "negative";
    } else if (sentimentCounts.positive > 0 && sentimentCounts.negative > 0) {
      overallSentiment = "mixed";
    } else {
      overallSentiment = "neutral";
    }

    return {
      overallSentiment,
      sentimentScore,
      confidence: 0.8, // Placeholder
      messageCount: total,
      negativeProportion,
      criticalMessages: criticalMessages.slice(0, 10), // Top 10
    };
  }

  // ==========================================================================
  // Metrics & Statistics
  // ==========================================================================

  /**
   * Get crisis metrics for a workspace
   */
  static async getMetrics(workspaceId: string): Promise<CrisisMetrics> {
    const [
      totalEvents,
      activeEvents,
      severityCounts,
      statusCounts,
      eventsLast7Days,
      eventsLast30Days,
      acknowledgedEvents,
      resolvedEvents,
    ] = await Promise.all([
      prisma.crisisDetectionEvent.count({ where: { workspaceId } }),
      prisma.crisisDetectionEvent.count({
        where: {
          workspaceId,
          status: { in: ["DETECTED", "ACKNOWLEDGED"] },
        },
      }),
      prisma.crisisDetectionEvent.groupBy({
        by: ["severity"],
        where: { workspaceId },
        _count: { severity: true },
      }),
      prisma.crisisDetectionEvent.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { status: true },
      }),
      prisma.crisisDetectionEvent.count({
        where: {
          workspaceId,
          detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.crisisDetectionEvent.count({
        where: {
          workspaceId,
          detectedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.crisisDetectionEvent.findMany({
        where: { workspaceId, acknowledgedAt: { not: null } },
        select: { detectedAt: true, acknowledgedAt: true },
      }),
      prisma.crisisDetectionEvent.findMany({
        where: { workspaceId, resolvedAt: { not: null } },
        select: { detectedAt: true, resolvedAt: true },
      }),
    ]);

    const eventsBySeverity: Record<CrisisSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const item of severityCounts) {
      eventsBySeverity[item.severity] = item._count.severity;
    }

    const eventsByStatus: Record<CrisisEventStatus, number> = {
      DETECTED: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
      FALSE_ALARM: 0,
    };
    for (const item of statusCounts) {
      eventsByStatus[item.status] = item._count.status;
    }

    // Calculate average times
    let averageTimeToAcknowledge: number | undefined;
    if (acknowledgedEvents.length > 0) {
      const totalTime = acknowledgedEvents.reduce((sum, event) => {
        const diff = event.acknowledgedAt!.getTime() -
          event.detectedAt.getTime();
        return sum + diff;
      }, 0);
      averageTimeToAcknowledge = totalTime / acknowledgedEvents.length / 60000; // minutes
    }

    let averageTimeToResolve: number | undefined;
    if (resolvedEvents.length > 0) {
      const totalTime = resolvedEvents.reduce((sum, event) => {
        const diff = event.resolvedAt!.getTime() - event.detectedAt.getTime();
        return sum + diff;
      }, 0);
      averageTimeToResolve = totalTime / resolvedEvents.length / 60000; // minutes
    }

    return {
      totalEvents,
      activeEvents,
      eventsBySeverity,
      eventsByStatus,
      averageTimeToAcknowledge,
      averageTimeToResolve,
      eventsLast7Days,
      eventsLast30Days,
    };
  }
}
