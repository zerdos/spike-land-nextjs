import type { AutopilotMode, AutopilotExecutionStatus } from '@prisma/client';
// Use any for Decimal in types to avoid runtime import issues in test environment
// import { Decimal } from '@prisma/client/runtime/library';
type Decimal = any;

// Configuration Types
export interface AutopilotConfig {
  id: string;
  workspaceId: string;
  campaignId?: string | null;
  isEnabled: boolean;
  mode: AutopilotMode;
  maxDailyBudgetChange: number; // percentage or fixed amount depending on implementation logic, likely percentage based on typical autopilot systems
  maxSingleChange: number;
  minRoasThreshold?: number | null;
  maxCpaThreshold?: number | null;
  pauseOnAnomaly: boolean;
  requireApprovalAbove?: number | null;
}

export type CreateAutopilotConfigInput = Omit<AutopilotConfig, 'id'>;
export type UpdateAutopilotConfigInput = Partial<CreateAutopilotConfigInput>;

// Execution Types
export interface AutopilotRecommendation {
  id: string;
  type: 'BUDGET_INCREASE' | 'BUDGET_DECREASE' | 'REALLOCATE';
  workspaceId: string;
  campaignId: string;
  currentBudget: number;
  suggestedBudget: number;
  reason: string;
  confidence: number;
  metadata?: Record<string, any>;
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
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  description: string;
}
