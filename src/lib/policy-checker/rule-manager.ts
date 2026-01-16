/**
 * Rule Manager
 *
 * Functions for managing policy rules (CRUD operations).
 *
 * Resolves #584: Build Policy Checker
 */

import type { PolicyRule, Prisma, SocialPlatform } from "@prisma/client";

import prisma from "@/lib/prisma";

import type { PolicyRuleInput } from "./types";

/**
 * Create a new policy rule
 */
export async function createRule(
  workspaceId: string | null,
  input: PolicyRuleInput,
): Promise<PolicyRule> {
  return prisma.policyRule.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
      platform: input.platform ?? null,
      category: input.category,
      ruleType: input.ruleType,
      conditions: input.conditions as unknown as Prisma.InputJsonValue,
      severity: input.severity ?? "WARNING",
      isBlocking: input.isBlocking ?? false,
      isActive: input.isActive ?? true,
      sourceUrl: input.sourceUrl ?? null,
    },
  });
}

/**
 * Update an existing policy rule
 */
export async function updateRule(
  ruleId: string,
  input: Partial<PolicyRuleInput>,
): Promise<PolicyRule> {
  const data: Prisma.PolicyRuleUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.platform !== undefined) data.platform = input.platform;
  if (input.category !== undefined) data.category = input.category;
  if (input.ruleType !== undefined) data.ruleType = input.ruleType;
  if (input.conditions !== undefined) {
    data.conditions = input.conditions as unknown as Prisma.InputJsonValue;
  }
  if (input.severity !== undefined) data.severity = input.severity;
  if (input.isBlocking !== undefined) data.isBlocking = input.isBlocking;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.sourceUrl !== undefined) data.sourceUrl = input.sourceUrl;

  // Increment version on update
  data.version = { increment: 1 };

  return prisma.policyRule.update({
    where: { id: ruleId },
    data,
  });
}

/**
 * Delete a policy rule
 */
export async function deleteRule(ruleId: string): Promise<PolicyRule> {
  return prisma.policyRule.delete({
    where: { id: ruleId },
  });
}

/**
 * Get a policy rule by ID
 */
export async function getRule(ruleId: string): Promise<PolicyRule | null> {
  return prisma.policyRule.findUnique({
    where: { id: ruleId },
  });
}

/**
 * Get all rules for a workspace (including global rules)
 */
export async function getRulesForWorkspace(
  workspaceId: string,
  options?: {
    platform?: SocialPlatform;
    category?: string;
    isActive?: boolean;
  },
): Promise<PolicyRule[]> {
  const where: Prisma.PolicyRuleWhereInput = {
    OR: [
      { workspaceId: null }, // Global rules
      { workspaceId }, // Workspace-specific rules
    ],
  };

  if (options?.platform) {
    // Match both platform-specific and global (null platform) rules
    where.OR = [
      { workspaceId: null, platform: null },
      { workspaceId: null, platform: options.platform },
      { workspaceId, platform: null },
      { workspaceId, platform: options.platform },
    ];
  }

  if (options?.category) {
    where.category = options
      .category as Prisma.EnumPolicyCategoryFilter["equals"];
  }

  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  return prisma.policyRule.findMany({
    where,
    orderBy: [{ severity: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}

/**
 * Get only workspace-specific rules (not global)
 */
export async function getWorkspaceRules(
  workspaceId: string,
): Promise<PolicyRule[]> {
  return prisma.policyRule.findMany({
    where: { workspaceId },
    orderBy: [{ severity: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}

/**
 * Get all global/system rules
 */
export async function getGlobalRules(): Promise<PolicyRule[]> {
  return prisma.policyRule.findMany({
    where: { workspaceId: null },
    orderBy: [{ severity: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}

/**
 * Toggle rule active status
 */
export async function toggleRuleActive(
  ruleId: string,
  isActive: boolean,
): Promise<PolicyRule> {
  return prisma.policyRule.update({
    where: { id: ruleId },
    data: { isActive },
  });
}

/**
 * Bulk create rules (for seeding default rules)
 */
export async function bulkCreateRules(
  rules: PolicyRuleInput[],
): Promise<number> {
  const result = await prisma.policyRule.createMany({
    data: rules.map((rule) => ({
      workspaceId: null, // Global rules
      name: rule.name,
      description: rule.description,
      platform: rule.platform ?? null,
      category: rule.category,
      ruleType: rule.ruleType,
      conditions: rule.conditions as unknown as Prisma.InputJsonValue,
      severity: rule.severity ?? "WARNING",
      isBlocking: rule.isBlocking ?? false,
      isActive: rule.isActive ?? true,
      sourceUrl: rule.sourceUrl ?? null,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Update rule's last verified timestamp
 */
export async function markRuleVerified(ruleId: string): Promise<PolicyRule> {
  return prisma.policyRule.update({
    where: { id: ruleId },
    data: { lastVerifiedAt: new Date() },
  });
}

/**
 * Get rules that need verification (not verified in last 30 days)
 */
export async function getRulesNeedingVerification(): Promise<PolicyRule[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return prisma.policyRule.findMany({
    where: {
      isActive: true,
      OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: thirtyDaysAgo } }],
    },
    orderBy: { lastVerifiedAt: "asc" },
  });
}

/**
 * Clone a rule for a workspace
 */
export async function cloneRule(
  ruleId: string,
  workspaceId: string,
): Promise<PolicyRule> {
  const sourceRule = await prisma.policyRule.findUnique({
    where: { id: ruleId },
  });

  if (!sourceRule) {
    throw new Error(`Rule not found: ${ruleId}`);
  }

  return prisma.policyRule.create({
    data: {
      workspaceId,
      name: `${sourceRule.name} (Copy)`,
      description: sourceRule.description,
      platform: sourceRule.platform,
      category: sourceRule.category,
      ruleType: sourceRule.ruleType,
      conditions: sourceRule.conditions as unknown as Prisma.InputJsonValue,
      severity: sourceRule.severity,
      isBlocking: sourceRule.isBlocking,
      isActive: true,
      sourceUrl: sourceRule.sourceUrl,
    },
  });
}

/**
 * Get rule statistics for a workspace
 */
export async function getRuleStatistics(workspaceId: string): Promise<{
  totalRules: number;
  activeRules: number;
  globalRules: number;
  workspaceRules: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}> {
  const allRules = await getRulesForWorkspace(workspaceId);

  const activeRules = allRules.filter((r) => r.isActive).length;
  const globalRules = allRules.filter((r) => r.workspaceId === null).length;
  const workspaceRules = allRules.filter((r) => r.workspaceId === workspaceId).length;

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const rule of allRules) {
    byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
    bySeverity[rule.severity] = (bySeverity[rule.severity] || 0) + 1;
  }

  return {
    totalRules: allRules.length,
    activeRules,
    globalRules,
    workspaceRules,
    byCategory,
    bySeverity,
  };
}
