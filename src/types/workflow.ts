import type {
  BranchType,
  StepRunStatus,
  WorkflowRunStatus,
  WorkflowStatus,
  WorkflowStepType,
} from "@prisma/client";

/**
 * Workflow step configuration for different action types
 */
export type WorkflowStepConfig = Record<string, unknown>;

/**
 * Workflow step with branching support
 */
export interface WorkflowStepData {
  id?: string;
  name: string;
  type: WorkflowStepType;
  sequence?: number;
  config: WorkflowStepConfig;
  dependencies?: string[];
  parentStepId?: string | null;
  branchType?: BranchType | null;
  branchCondition?: string | null;
  childSteps?: WorkflowStepData[];
}

/**
 * Workflow version with steps
 */
export interface WorkflowVersionData {
  id?: string;
  version: number;
  description?: string | null;
  isPublished: boolean;
  publishedAt?: Date | null;
  steps: WorkflowStepData[];
}

/**
 * Full workflow data structure
 */
export interface WorkflowData {
  id?: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  workspaceId: string;
  createdById?: string;
  versions?: WorkflowVersionData[];
}

/**
 * Create workflow input
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  steps?: WorkflowStepData[];
}

/**
 * Update workflow input
 */
export interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  status?: WorkflowStatus;
}

/**
 * Create workflow version input
 */
export interface CreateVersionInput {
  description?: string;
  steps: WorkflowStepData[];
}

/**
 * Workflow run log entry
 */
export interface WorkflowRunLogEntry {
  stepId?: string;
  stepStatus?: StepRunStatus;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Workflow run data
 */
export interface WorkflowRunData {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: Date;
  endedAt?: Date | null;
  logs: WorkflowRunLogEntry[];
}

/**
 * DSL format for workflow import/export
 */
export interface WorkflowDSL {
  version: "1.0";
  name: string;
  description?: string;
  steps: WorkflowStepDSL[];
}

/**
 * DSL format for a single step
 */
export interface WorkflowStepDSL {
  id: string;
  name: string;
  type: WorkflowStepType;
  config: WorkflowStepConfig;
  dependsOn?: string[];
  branches?: WorkflowBranchDSL[];
}

/**
 * DSL format for a branch
 */
export interface WorkflowBranchDSL {
  type: BranchType;
  condition?: string;
  steps: WorkflowStepDSL[];
}

/**
 * Validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
}

/**
 * Validation error
 */
export interface WorkflowValidationError {
  code: string;
  message: string;
  stepId?: string;
  path?: string;
}

/**
 * Validation warning
 */
export interface WorkflowValidationWarning {
  code: string;
  message: string;
  stepId?: string;
  path?: string;
}

/**
 * API response for workflow operations
 */
export interface WorkflowApiResponse {
  workflow: WorkflowData;
}

/**
 * API response for listing workflows
 */
export interface WorkflowsListApiResponse {
  workflows: WorkflowData[];
  total: number;
  page: number;
  pageSize: number;
}
