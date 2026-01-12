import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { FeatureFlagService } from "../feature-flags/feature-flag-service";
import { AutopilotAnomalyIntegration } from "./autopilot-anomaly-integration";
import type {
  AutopilotConfig,
  AutopilotExecutionResult,
  AutopilotRecommendation,
  UpdateAutopilotConfigInput,
} from "./autopilot-types";
import { GuardrailAlertService } from "./guardrail-alert-service";

const Decimal = Prisma.Decimal;

export class AutopilotService {
  /**
   * Get autopilot configuration for a workspace or specific campaign.
   */
  static async getAutopilotConfig(
    workspaceId: string,
    campaignId?: string,
  ): Promise<AutopilotConfig | null> {
    let config = null;

    if (campaignId) {
      config = await prisma.allocatorAutopilotConfig.findUnique({
        where: {
          workspaceId_campaignId: {
            workspaceId,
            campaignId,
          },
        },
      });
    }

    if (!config) {
      // Fallback to workspace level config
      config = await prisma.allocatorAutopilotConfig.findFirst({
        where: {
          workspaceId,
          campaignId: null,
        },
      });
    }

    if (!config) return null;

    return {
      ...config,
      maxDailyBudgetChange: config.maxDailyBudgetChange.toNumber(),
      maxSingleChange: config.maxSingleChange.toNumber(),
      minRoasThreshold: config.minRoasThreshold?.toNumber() ?? null,
      maxCpaThreshold: config.maxCpaThreshold?.toNumber() ?? null,
      requireApprovalAbove: config.requireApprovalAbove?.toNumber() ?? null,
      minBudget: config.minBudget?.toNumber() ?? null,
      maxBudget: config.maxBudget?.toNumber() ?? null,
      cooldownMinutes: config.cooldownMinutes,
      isEmergencyStopped: config.isEmergencyStopped,
    };
  }

  /**
   * Update or create autopilot configuration.
   */
  static async setAutopilotConfig(
    workspaceId: string,
    data: UpdateAutopilotConfigInput,
    campaignId?: string,
  ): Promise<AutopilotConfig> {
    // Check feature flag
    const enabled = await FeatureFlagService.isFeatureEnabled("allocator_autopilot", workspaceId);
    if (!enabled && data.isEnabled) {
      throw new Error("Autopilot feature is not enabled for this workspace.");
    }

    // Note: workspaceId_campaignId composite unique index requires both fields.
    // However, campaignId can be null. Prisma handling of null in composite unique varies by DB.
    // In Postgres, multiple NULLs are distinct unless specified otherwise, but Prisma schema defines it.
    // Let's rely on findFirst logic if needed or standard upsert.

    // For upsert, we need a unique identifier.
    // If campaignId is undefined, we assume workspace-level config (campaignId: null).

    // Check if exists first to decide update vs create to avoid unique constraint complexities with nulls if any
    const existing = await prisma.allocatorAutopilotConfig.findFirst({
      where: {
        workspaceId,
        campaignId: campaignId || null,
      },
    });

    let config;
    if (existing) {
      config = await prisma.allocatorAutopilotConfig.update({
        where: { id: existing.id },
        data: {
          ...data,
          maxDailyBudgetChange: data.maxDailyBudgetChange
            ? new Decimal(data.maxDailyBudgetChange)
            : undefined,
          maxSingleChange: data.maxSingleChange ? new Decimal(data.maxSingleChange) : undefined,
          minRoasThreshold: data.minRoasThreshold !== undefined
            ? (data.minRoasThreshold ? new Decimal(data.minRoasThreshold) : null)
            : undefined,
          maxCpaThreshold: data.maxCpaThreshold !== undefined
            ? (data.maxCpaThreshold ? new Decimal(data.maxCpaThreshold) : null)
            : undefined,
          requireApprovalAbove: data.requireApprovalAbove !== undefined
            ? (data.requireApprovalAbove ? new Decimal(data.requireApprovalAbove) : null)
            : undefined,
          minBudget: data.minBudget !== undefined
            ? (data.minBudget ? new Decimal(data.minBudget) : null)
            : undefined,
          maxBudget: data.maxBudget !== undefined
            ? (data.maxBudget ? new Decimal(data.maxBudget) : null)
            : undefined,
          cooldownMinutes: data.cooldownMinutes,
          isEmergencyStopped: data.isEmergencyStopped,
        },
      });
    } else {
      config = await prisma.allocatorAutopilotConfig.create({
        data: {
          workspaceId,
          campaignId: campaignId || null,
          isEnabled: data.isEnabled ?? false,
          mode: data.mode ?? "CONSERVATIVE",
          maxDailyBudgetChange: new Decimal(data.maxDailyBudgetChange ?? 10.0),
          maxSingleChange: new Decimal(data.maxSingleChange ?? 5.0),
          minRoasThreshold: data.minRoasThreshold ? new Decimal(data.minRoasThreshold) : null,
          maxCpaThreshold: data.maxCpaThreshold ? new Decimal(data.maxCpaThreshold) : null,
          pauseOnAnomaly: data.pauseOnAnomaly ?? true,
          requireApprovalAbove: data.requireApprovalAbove
            ? new Decimal(data.requireApprovalAbove)
            : null,
          minBudget: data.minBudget ? new Decimal(data.minBudget) : null,
          maxBudget: data.maxBudget ? new Decimal(data.maxBudget) : null,
          cooldownMinutes: data.cooldownMinutes ?? 60,
          isEmergencyStopped: data.isEmergencyStopped ?? false,
        },
      });
    }

    return {
      ...config,
      maxDailyBudgetChange: config.maxDailyBudgetChange.toNumber(),
      maxSingleChange: config.maxSingleChange.toNumber(),
      minRoasThreshold: config.minRoasThreshold?.toNumber() ?? null,
      maxCpaThreshold: config.maxCpaThreshold?.toNumber() ?? null,
      requireApprovalAbove: config.requireApprovalAbove?.toNumber() ?? null,
      minBudget: config.minBudget?.toNumber() ?? null,
      maxBudget: config.maxBudget?.toNumber() ?? null,
      cooldownMinutes: config.cooldownMinutes,
      isEmergencyStopped: config.isEmergencyStopped,
    };
  }

  /**
   * Evaluate a recommendation against the autopilot rules.
   */
  static async evaluateRecommendation(
    recommendation: AutopilotRecommendation,
    config?: AutopilotConfig | null,
  ): Promise<{ shouldExecute: boolean; reason?: string; }> {
    if (!config) {
      config = await this.getAutopilotConfig(recommendation.workspaceId, recommendation.campaignId);
    }

    if (!config || !config.isEnabled) {
      return { shouldExecute: false, reason: "Autopilot disabled" };
    }

    // Check Emergency Stop
    if (config.isEmergencyStopped) {
      return { shouldExecute: false, reason: "Emergency stop is active" };
    }

    // Check Budget Floor
    if (config.minBudget && recommendation.suggestedBudget < config.minBudget) {
      const message =
        `Suggested budget ${recommendation.suggestedBudget} is below floor ${config.minBudget}`;
      // Async alert creation
      GuardrailAlertService.createAlert({
        workspaceId: recommendation.workspaceId,
        campaignId: recommendation.campaignId,
        alertType: "BUDGET_FLOOR_HIT",
        severity: "WARNING",
        message,
        metadata: {
          suggested: recommendation.suggestedBudget,
          min: config.minBudget,
        },
      }).catch(console.error);

      return { shouldExecute: false, reason: message };
    }

    // Check Budget Ceiling
    if (config.maxBudget && recommendation.suggestedBudget > config.maxBudget) {
      const message =
        `Suggested budget ${recommendation.suggestedBudget} exceeds ceiling ${config.maxBudget}`;
      // Async alert creation
      GuardrailAlertService.createAlert({
        workspaceId: recommendation.workspaceId,
        campaignId: recommendation.campaignId,
        alertType: "BUDGET_CEILING_HIT",
        severity: "WARNING",
        message,
        metadata: {
          suggested: recommendation.suggestedBudget,
          max: config.maxBudget,
        },
      }).catch(console.error);

      return { shouldExecute: false, reason: message };
    }

    // Check Cool-down Period
    const lastExecution = await prisma.allocatorAutopilotExecution.findFirst({
      where: {
        workspaceId: recommendation.workspaceId,
        campaignId: recommendation.campaignId,
        status: "COMPLETED",
      },
      orderBy: { executedAt: "desc" },
    });

    if (lastExecution && config.cooldownMinutes > 0) {
      const timeSinceLast = (Date.now() - lastExecution.executedAt.getTime()) / (1000 * 60);
      if (timeSinceLast < config.cooldownMinutes) {
        const message = `Cool-down active. ${
          timeSinceLast.toFixed(0)
        }m vs ${config.cooldownMinutes}m required`;
        // Async alert creation (only if it's a new occurrence? might be spammy, keeping generic severity info)
        GuardrailAlertService.createAlert({
          workspaceId: recommendation.workspaceId,
          campaignId: recommendation.campaignId,
          alertType: "COOLDOWN_ACTIVE",
          severity: "INFO",
          message,
        }).catch(console.error);
        return { shouldExecute: false, reason: message };
      }
    }

    // Check Anomaly Pause
    if (config.pauseOnAnomaly) {
      const anomalies = await AutopilotAnomalyIntegration.checkForAnomalies(
        recommendation.workspaceId,
      );
      if (anomalies.length > 0) {
        return {
          shouldExecute: false,
          reason: `Paused due to anomalies: ${anomalies.map(a => a.type).join(", ")}`,
        };
      }
    }

    // Check Single Change Limit
    const proposedChangePercent = Math.abs(
      (recommendation.suggestedBudget - recommendation.currentBudget) /
        recommendation.currentBudget * 100,
    );
    if (proposedChangePercent > config.maxSingleChange) {
      return {
        shouldExecute: false,
        reason: `Change ${
          proposedChangePercent.toFixed(2)
        }% exceeds single move limit of ${config.maxSingleChange}%`,
      };
    }

    // Check Approval Threshold (Absolute Value)
    if (config.requireApprovalAbove) {
      const absChange = Math.abs(recommendation.suggestedBudget - recommendation.currentBudget);
      if (absChange > config.requireApprovalAbove) {
        return {
          shouldExecute: false,
          reason:
            `Change amount ${absChange} exceeds auto-approval threshold ${config.requireApprovalAbove}`,
        };
      }
    }

    // Check Daily Limit (requires DB check)
    const canMove = await this.checkDailyLimits(
      recommendation.campaignId,
      recommendation.suggestedBudget - recommendation.currentBudget,
      config.maxDailyBudgetChange,
      recommendation.currentBudget,
    );

    if (!canMove) {
      return { shouldExecute: false, reason: "Daily budget move limit reached" };
    }

    return { shouldExecute: true };
  }

  /**
   * Execute a recommendation.
   */
  static async executeRecommendation(
    recommendation: AutopilotRecommendation,
    triggerSource: string = "CRON",
  ): Promise<AutopilotExecutionResult> {
    const config = await this.getAutopilotConfig(
      recommendation.workspaceId,
      recommendation.campaignId,
    );

    // Immediate Emergency Stop Check (double check at execution time)
    if (config?.isEmergencyStopped) {
      return {
        executionId: "emergency_stopped",
        status: "SKIPPED",
        budgetChange: 0,
        newBudget: recommendation.currentBudget,
        message: "Emergency stop is active",
      };
    }

    const evaluation = await this.evaluateRecommendation(recommendation, config);

    if (!evaluation.shouldExecute) {
      // Log skipped execution
      await prisma.allocatorAutopilotExecution.create({
        data: {
          workspaceId: recommendation.workspaceId,
          campaignId: recommendation.campaignId,
          recommendationId: recommendation.id,
          recommendationType: recommendation.type,
          status: "SKIPPED",
          previousBudget: new Decimal(recommendation.currentBudget),
          newBudget: new Decimal(recommendation.suggestedBudget),
          budgetChange: new Decimal(recommendation.suggestedBudget - recommendation.currentBudget),
          metadata: { reason: evaluation.reason, triggerSource },
        },
      });

      return {
        executionId: "skipped",
        status: "SKIPPED",
        budgetChange: 0,
        newBudget: recommendation.currentBudget,
        message: evaluation.reason,
      };
    }

    // Execute Change (Simulated for now, would call platform API)
    // TODO: Integrate with Facebook/Google Ads API via Allocator Service
    const budgetChange = recommendation.suggestedBudget - recommendation.currentBudget;

    // Log Execution (Initial record)
    const execution = await prisma.allocatorAutopilotExecution.create({
      data: {
        workspaceId: recommendation.workspaceId,
        campaignId: recommendation.campaignId,
        recommendationId: recommendation.id,
        recommendationType: recommendation.type,
        status: "EXECUTING",
        previousBudget: new Decimal(recommendation.currentBudget),
        newBudget: new Decimal(recommendation.suggestedBudget),
        budgetChange: new Decimal(budgetChange),
        metadata: { triggerSource },
      },
    });

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Update Campaign Budget in DB
        await tx.allocatorCampaign.update({
          where: { id: recommendation.campaignId },
          data: { budget: new Decimal(recommendation.suggestedBudget) },
        });

        // 2. Track Daily Move
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.allocatorDailyBudgetMove.upsert({
          where: {
            campaignId_date: {
              campaignId: recommendation.campaignId,
              date: today,
            },
          },
          create: {
            campaignId: recommendation.campaignId,
            date: today,
            totalMoved: new Decimal(Math.abs(budgetChange)),
            netChange: new Decimal(budgetChange),
            executionCount: 1,
          },
          update: {
            totalMoved: { increment: new Decimal(Math.abs(budgetChange)) },
            netChange: { increment: new Decimal(budgetChange) },
            executionCount: { increment: 1 },
          },
        });

        // 3. Update status to COMPLETED
        await tx.allocatorAutopilotExecution.update({
          where: { id: execution.id },
          data: { status: "COMPLETED" },
        });

        return {
          executionId: execution.id,
          status: "COMPLETED",
          budgetChange,
          newBudget: recommendation.suggestedBudget,
        };
      });
    } catch (error) {
      await prisma.allocatorAutopilotExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            triggerSource,
          },
        },
      });
      throw error;
    }
  }

  /**
   * Rollback a previous execution.
   */
  static async rollbackExecution(
    executionId: string,
    userId: string,
  ): Promise<AutopilotExecutionResult> {
    const execution = await prisma.allocatorAutopilotExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || execution.status !== "COMPLETED") {
      throw new Error("Execution not found or not completed");
    }

    if (execution.rolledBackAt) {
      throw new Error("Execution already rolled back");
    }

    // Create a new execution that is the inverse
    const rollbackRecommendation: AutopilotRecommendation = {
      id: `rollback-${execution.id}`,
      type: execution.recommendationType === "BUDGET_INCREASE"
        ? "BUDGET_DECREASE"
        : "BUDGET_INCREASE", // Invert type approximately
      workspaceId: execution.workspaceId,
      campaignId: execution.campaignId,
      currentBudget: execution.newBudget.toNumber(),
      suggestedBudget: execution.previousBudget.toNumber(),
      reason: `Rollback of execution ${execution.id} by user ${userId}`,
      confidence: 1.0,
    };

    // Force execution (bypass checks?) - usually yes for manual rollback
    // But we reuse logic to record it.

    const budgetChange = rollbackRecommendation.suggestedBudget -
      rollbackRecommendation.currentBudget;

    // Record rollback record
    const rollback = await prisma.allocatorAutopilotExecution.create({
      data: {
        workspaceId: rollbackRecommendation.workspaceId,
        campaignId: rollbackRecommendation.campaignId,
        recommendationId: rollbackRecommendation.id,
        recommendationType: "ROLLBACK",
        status: "EXECUTING",
        previousBudget: new Decimal(rollbackRecommendation.currentBudget),
        newBudget: new Decimal(rollbackRecommendation.suggestedBudget),
        budgetChange: new Decimal(budgetChange),
        metadata: { originalExecutionId: executionId, rolledBackBy: userId },
        rollbackOfId: executionId, // Link to original
      },
    });

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Update Campaign Budget
        await tx.allocatorCampaign.update({
          where: { id: rollbackRecommendation.campaignId },
          data: { budget: new Decimal(rollbackRecommendation.suggestedBudget) },
        });

        // 2. Track Daily Move (Reverse change for net, but still counts as a move for total)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.allocatorDailyBudgetMove.upsert({
          where: {
            campaignId_date: {
              campaignId: rollbackRecommendation.campaignId,
              date: today,
            },
          },
          create: {
            campaignId: rollbackRecommendation.campaignId,
            date: today,
            totalMoved: new Decimal(Math.abs(budgetChange)),
            netChange: new Decimal(budgetChange),
            executionCount: 1,
          },
          update: {
            totalMoved: { increment: new Decimal(Math.abs(budgetChange)) },
            netChange: { increment: new Decimal(budgetChange) },
            executionCount: { increment: 1 },
          },
        });

        // 3. Mark original as rolled back
        await tx.allocatorAutopilotExecution.update({
          where: { id: executionId },
          data: {
            rolledBackAt: new Date(),
            rolledBackByUserId: userId,
            status: "ROLLED_BACK",
          },
        });

        // 4. Update status to COMPLETED
        await tx.allocatorAutopilotExecution.update({
          where: { id: rollback.id },
          data: { status: "COMPLETED" },
        });

        return {
          executionId: rollback.id,
          status: "COMPLETED",
          budgetChange: budgetChange,
          newBudget: rollbackRecommendation.suggestedBudget,
        };
      });
    } catch (error) {
      await prisma.allocatorAutopilotExecution.update({
        where: { id: rollback.id },
        data: {
          status: "FAILED",
          metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        },
      });
      throw error;
    }
  }

  private static async checkDailyLimits(
    campaignId: string,
    amountChange: number,
    limitPercent: number,
    baseBudget: number,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyMove = await prisma.allocatorDailyBudgetMove.findUnique({
      where: {
        campaignId_date: {
          campaignId,
          date: today,
        },
      },
    });

    const currentTotalMoved = dailyMove ? dailyMove.totalMoved.toNumber() : 0;
    const newTotalMoved = currentTotalMoved + Math.abs(amountChange);

    const limitAmount = baseBudget * (limitPercent / 100);

    return newTotalMoved <= limitAmount;
  }
}
