/**
 * Ralph Automation Types
 * Shared type definitions for the Jules workforce manager
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface RalphConfig {
  wip_limit: number;
  auto_approve: boolean;
  auto_merge: boolean;
  auto_publish: boolean;
  max_retries: number;
  repo: string;
  cli_mode: boolean;
  work_streams: WorkStreamConfig;
}

export interface WorkStreamConfig {
  features: number;
  testing: number;
  bugs: number;
  debt: number;
  experiments: number;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface RalphRegistry {
  active: boolean;
  iteration: number;
  max_iterations: number;
  completion_promise: string;
  started_at: string;
  daily_sessions_used: number;
  daily_session_limit: number;
  config: RalphConfig;
  activeTasks: TaskEntry[];
  pipelineTracking: PipelineTracking;
}

export interface TaskEntry {
  issue: string;
  sessionId: string;
  status: TaskStatus;
  prNumber: string | null;
  retries: number;
  lastUpdated: string;
}

export type TaskStatus =
  | "QUEUED"
  | "PLANNING"
  | "AWAITING_PLAN_APPROVAL"
  | "AWAITING_USER_FEEDBACK"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "COMPLETED→AWAIT_PR"
  | "PR_CREATED"
  | "PR_CI_FAILING"
  | "PR_CI_INFRA_ISSUE"
  | "PR_BEHIND_MAIN"
  | "REVIEW_REQUESTED"
  | "REVIEW_STARTED"
  | "REVIEW_APPROVED"
  | "REVIEW_CHANGES_REQUESTED"
  | "REVIEW_CHANGES_REQ"
  | "JULES_FIXING_REVIEW"
  | "JULES_FIX_COMPLETED"
  | "AWAITING_PR_CREATION"
  | "FAILED"
  | "DEAD";

export interface PipelineTracking {
  batchA: PipelineBatch | null;
  batchB: PipelineBatch | null;
}

export interface PipelineBatch {
  sessions: string[];
  status: "PLANNING" | "IMPLEMENTING" | "COMPLETING";
  started: string;
  estComplete: string;
}

// ============================================================================
// Jules Session Types
// ============================================================================

export interface JulesSession {
  id: string;
  title: string;
  status: JulesStatus;
  createdAt: string;
  sourceRepo?: string;
  prUrl?: string;
}

export type JulesStatus =
  | "QUEUED"
  | "PLANNING"
  | "AWAITING_PLAN_APPROVAL"
  | "AWAITING_USER_FEEDBACK"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export interface JulesSessionDetails extends JulesSession {
  planSummary?: string;
  activities: JulesActivity[];
}

export interface JulesActivity {
  timestamp: string;
  type: string;
  message: string;
}

// ============================================================================
// Iteration Types
// ============================================================================

export interface IterationResult {
  sessionsCreated: number;
  plansApproved: string[];
  prsCreated: string[];
  prsMerged: string[];
  messagesSent: string[];
  errors: string[];
  updatedTasks: TaskEntry[];
  meaningfulWork: boolean;
  summary: string;
  startTime: Date;
  endTime: Date;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  success: boolean;
  issues: string[];
  metrics: ValidationMetrics;
}

export interface ValidationMetrics {
  approvalRate: number;
  prCreationRate: number;
  ciPassRate: number;
  mergeRate: number;
  pipelineUtilization: number;
  backlogSize: number;
}

// ============================================================================
// PR Types (from bash scripts)
// ============================================================================

export interface PRHealth {
  pr: number;
  ci_passing: boolean;
  ci_pending: boolean;
  is_draft: boolean;
  merge_state: "CLEAN" | "BEHIND" | "DIRTY" | "UNKNOWN";
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  review: "APPROVED" | "CHANGES_REQUESTED" | "PENDING" | null;
  branch: string;
  updated: string;
}

export interface PRBatchStatus extends PRHealth {
  action:
    | "READY_TO_MERGE"
    | "READY_TO_PUBLISH"
    | "CI_FAILING"
    | "CI_PENDING"
    | "NEEDS_FIXES"
    | "NEEDS_REBASE"
    | "AWAITING_REVIEW";
}

export interface CIStatus {
  status: "passing" | "failing" | "in_progress";
  run_id?: string;
  workflow?: string;
  error_excerpt?: string;
}

// ============================================================================
// GitHub Issue Types
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  priority: "CRITICAL" | "BUG" | "QUICK_WIN" | "NORMAL";
}

// ============================================================================
// Self-Improvement Types
// ============================================================================

export interface ImprovementRule {
  condition: (result: IterationResult, validation: ValidationResult) => boolean;
  action: (result: IterationResult, validation: ValidationResult) => Promise<string>;
}

export interface ConfigUpdate {
  backlog_clear_rate?: number;
  aggressive_queue?: boolean;
  pre_pr_tsc_check?: boolean;
}

/**
 * Runtime configuration that can be dynamically adjusted during execution
 * Stored in .claude/ralph-runtime-config.json
 */
export interface RalphRuntimeConfig {
  backlog_clear_rate?: number;
  aggressive_queue?: boolean;
  pre_pr_tsc_check?: boolean;
  pr_lifecycle_priority?: boolean;
  cooldown_until?: string;
}

export interface KnownIssue {
  pattern: string;
  firstSeen: string;
  occurrences: number;
  resolution?: string;
}
