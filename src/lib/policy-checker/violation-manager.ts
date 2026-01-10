/**
 * Violation Manager
 *
 * Functions for managing policy violations (override, resolve, query).
 *
 * Resolves #584: Build Policy Checker
 */

import type { PolicyCheck, PolicyViolation, Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import type { ViolationSummary } from "./types";

/**
 * Get a specific violation by ID
 */
export async function getViolation(violationId: string): Promise<PolicyViolation | null> {
  return prisma.policyViolation.findUnique({
    where: { id: violationId },
    include: {
      rule: true,
      check: true,
    },
  });
}

/**
 * Get all violations for a check
 */
export async function getViolationsForCheck(checkId: string): Promise<PolicyViolation[]> {
  return prisma.policyViolation.findMany({
    where: { checkId },
    include: { rule: true },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Get violation history for a workspace
 */
export async function getViolationHistory(
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
    severity?: string;
    ruleId?: string;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<{ violations: PolicyViolation[]; total: number; }> {
  const where: Prisma.PolicyViolationWhereInput = {
    workspaceId,
  };

  if (options?.severity) {
    where.severity = options.severity as Prisma.EnumPolicySeverityFilter["equals"];
  }

  if (options?.ruleId) {
    where.ruleId = options.ruleId;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [violations, total] = await Promise.all([
    prisma.policyViolation.findMany({
      where,
      include: { rule: true, check: true },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.policyViolation.count({ where }),
  ]);

  return { violations, total };
}

/**
 * Override a violation (approve despite the violation)
 */
export async function overrideViolation(
  violationId: string,
  userId: string,
  reason: string,
): Promise<PolicyViolation> {
  return prisma.policyViolation.update({
    where: { id: violationId },
    data: {
      isOverridden: true,
      overriddenById: userId,
      overrideReason: reason,
      overriddenAt: new Date(),
    },
  });
}

/**
 * Remove override from a violation
 */
export async function removeOverride(violationId: string): Promise<PolicyViolation> {
  return prisma.policyViolation.update({
    where: { id: violationId },
    data: {
      isOverridden: false,
      overriddenById: null,
      overrideReason: null,
      overriddenAt: null,
    },
  });
}

/**
 * Get violation statistics for a workspace
 */
export async function getViolationStatistics(
  workspaceId: string,
  days: number = 30,
): Promise<{
  totalViolations: number;
  overriddenViolations: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byRule: Array<{ ruleId: string; ruleName: string; count: number; }>;
  trend: Array<{ date: string; count: number; }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const violations = await prisma.policyViolation.findMany({
    where: {
      workspaceId,
      createdAt: { gte: startDate },
    },
    include: { rule: true },
  });

  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRuleMap: Map<string, { ruleId: string; ruleName: string; count: number; }> = new Map();
  const trendMap: Map<string, number> = new Map();

  let overriddenCount = 0;

  for (const violation of violations) {
    // Count by severity
    bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;

    // Count by category
    const category = violation.rule.category;
    byCategory[category] = (byCategory[category] || 0) + 1;

    // Count by rule
    const ruleStats = byRuleMap.get(violation.ruleId) || {
      ruleId: violation.ruleId,
      ruleName: violation.rule.name,
      count: 0,
    };
    ruleStats.count++;
    byRuleMap.set(violation.ruleId, ruleStats);

    // Count overridden
    if (violation.isOverridden) {
      overriddenCount++;
    }

    // Count by date for trend
    const dateKey = violation.createdAt.toISOString().split("T")[0]!;
    trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
  }

  // Convert trend map to sorted array
  const trend = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get top rules by violation count
  const byRule = Array.from(byRuleMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViolations: violations.length,
    overriddenViolations: overriddenCount,
    bySeverity,
    byCategory,
    byRule,
    trend,
  };
}

/**
 * Get a policy check by ID
 */
export async function getCheck(checkId: string): Promise<PolicyCheck | null> {
  return prisma.policyCheck.findUnique({
    where: { id: checkId },
    include: {
      violations: {
        include: { rule: true },
      },
    },
  });
}

/**
 * Get check history for a workspace
 */
export async function getCheckHistory(
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
    contentType?: string;
    result?: string;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<{ checks: PolicyCheck[]; total: number; }> {
  const where: Prisma.PolicyCheckWhereInput = {
    workspaceId,
    status: "COMPLETED",
  };

  if (options?.contentType) {
    where.contentType = options.contentType as Prisma.EnumPolicyContentTypeFilter["equals"];
  }

  if (options?.result) {
    where.overallResult = options.result as Prisma.EnumPolicyCheckResultNullableFilter["equals"];
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [checks, total] = await Promise.all([
    prisma.policyCheck.findMany({
      where,
      include: {
        violations: {
          include: { rule: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.policyCheck.count({ where }),
  ]);

  return { checks, total };
}

/**
 * Get checks for a specific content item
 */
export async function getChecksForContent(
  contentType: string,
  contentId: string,
): Promise<PolicyCheck[]> {
  return prisma.policyCheck.findMany({
    where: {
      contentType: contentType as Prisma.EnumPolicyContentTypeFilter["equals"],
      contentId,
    },
    include: {
      violations: {
        include: { rule: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Convert violation to summary format
 */
export function violationToSummary(
  violation: PolicyViolation & { rule: { name: string; category: string; isBlocking: boolean; }; },
): ViolationSummary {
  return {
    ruleId: violation.ruleId,
    ruleName: violation.rule.name,
    ruleCategory: violation.rule.category as ViolationSummary["ruleCategory"],
    severity: violation.severity,
    message: violation.message,
    matchedContent: violation.matchedContent ?? undefined,
    suggestedFix: violation.suggestedFix ?? undefined,
    confidence: violation.confidence ?? undefined,
    isBlocking: violation.rule.isBlocking,
  };
}

/**
 * Delete old checks and violations (data retention)
 */
export async function cleanupOldChecks(
  workspaceId: string,
  retentionDays: number,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.policyCheck.deleteMany({
    where: {
      workspaceId,
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
