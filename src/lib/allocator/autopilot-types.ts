import type { AutopilotExecutionStatus, AutopilotMode } from "@prisma/client";

// Configuration Types
export interface AutopilotConfig {
  id: string;
  workspaceId: string;
  campaignId?: string | null;
  isEnabled: boolean;
  mode: AutopilotMode;
  maxDailyBudgetChange: number; // percentage
  maxSingleChange: number; // percentage
  minRoasThreshold?: number | null;
  maxCpaThreshold?: number | null;
  pauseOnAnomaly: boolean;
  requireApprovalAbove?: number | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  cooldownMinutes: number;
  isEmergencyStopped: boolean;
  emergencyStoppedAt?: Date | null;
  emergencyStoppedBy?: string | null;
  emergencyStopReason?: string | null;
}

export type CreateAutopilotConfigInput = Omit<AutopilotConfig, "id">;
export type UpdateAutopilotConfigInput = Partial<CreateAutopilotConfigInput>;

// Execution Types
export interface AutopilotRecommendation {
  id: string;
  type: "BUDGET_INCREASE" | "BUDGET_DECREASE" | "REALLOCATE";
  workspaceId: string;
  campaignId: string;
  currentBudget: number;
  suggestedBudget: number;
  reason: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface AutopilotExecutionResult {
  executionId: string;
  status: AutopilotExecutionStatus;
  budgetChange: number;
  newBudget: number;
  message?: string;
}

export interface AutopilotAnomaly {
  workspaceId: string;
  campaignId?: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: Date;
  description: string;
}
