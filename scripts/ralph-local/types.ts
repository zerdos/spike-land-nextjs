/**
 * Ralph Local Orchestrator Types
 * Type definitions for local multi-agent orchestration
 */

// ============================================================================
// Agent Types
// ============================================================================

export type AgentRole = "planning" | "developer" | "tester";

export type AgentStatus =
  | "idle"
  | "starting"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export interface LocalAgent {
  id: string;
  role: AgentRole;
  pid: number | null;
  status: AgentStatus;
  ticketId: string | null;
  worktree: string | null;
  outputFile: string;
  pidFile: string;
  startedAt: string | null;
  lastHeartbeat: string | null;
  retries: number;
}

// ============================================================================
// Pool Configuration
// ============================================================================

export interface PoolConfig {
  planning: number;
  developer: number;
  tester: number;
}

export interface AgentPool {
  planning: LocalAgent[];
  developer: LocalAgent[];
  tester: LocalAgent[];
}

// ============================================================================
// Work Items
// ============================================================================

export interface Plan {
  ticketId: string;
  issueNumber: number;
  title: string;
  planPath: string;
  createdAt: string;
  createdBy: string; // Agent ID that created the plan
  status: "pending" | "assigned" | "implemented";
  assignedTo: string | null; // Developer agent ID
}

export interface CodeWork {
  ticketId: string;
  issueNumber: number;
  branch: string;
  worktree: string;
  planPath: string;
  createdAt: string;
  createdBy: string; // Developer agent ID that implemented it
  status: "pending" | "assigned" | "reviewed" | "pr_created";
  assignedTo: string | null; // Tester agent ID
  prUrl: string | null;
  prNumber: number | null;
}

// ============================================================================
// State Management
// ============================================================================

export interface OrchestratorState {
  version: number;
  lastUpdated: string;
  iteration: number;
  pools: AgentPool;
  pendingPlans: Plan[];
  pendingCode: CodeWork[];
  completedTickets: string[];
  failedTickets: string[];
  blockedTickets: BlockedTicket[];
}

export interface BlockedTicket {
  ticketId: string;
  reason: string;
  blockedAt: string;
  retries: number;
  lastAttemptBy: string;
}

// ============================================================================
// Agent Output Markers
// ============================================================================

export type AgentMarker =
  | PlanReadyMarker
  | CodeReadyMarker
  | PRCreatedMarker
  | BlockedMarker
  | ErrorMarker;

export interface PlanReadyMarker {
  type: "PLAN_READY";
  ticketId: string;
  path: string;
}

export interface CodeReadyMarker {
  type: "CODE_READY";
  ticketId: string;
  branch: string;
}

export interface PRCreatedMarker {
  type: "PR_CREATED";
  ticketId: string;
  prUrl: string;
  prNumber: number;
}

export interface BlockedMarker {
  type: "BLOCKED";
  ticketId: string;
  reason: string;
}

export interface ErrorMarker {
  type: "ERROR";
  ticketId: string;
  error: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface RalphLocalConfig {
  active: boolean;
  poolSizes: PoolConfig;
  syncIntervalMs: number;
  staleThresholdMs: number;
  maxRetries: number;
  autoMerge: boolean;
  repo: string;
  workDir: string;
  outputDir: string;
  pidDir: string;
  planDir: string;
  worktreeBase: string;
}

// ============================================================================
// Iteration Results
// ============================================================================

export interface LocalIterationResult {
  iteration: number;
  startTime: Date;
  endTime: Date;
  agentsSpawned: number;
  plansCreated: number;
  codeImplemented: number;
  prsCreated: number;
  prsMerged: number;
  staleAgentsCleaned: number;
  errors: string[];
  summary: string;
}

// ============================================================================
// PR Status (from existing Ralph types)
// ============================================================================

export interface PRReviewStatus {
  prNumber: number;
  status: "APPROVED" | "CHANGES_REQUESTED" | "PENDING" | "CI_FAILING";
  reviewComments: string[];
  ciStatus: "passing" | "failing" | "pending";
}

// ============================================================================
// GitHub Issue (from existing Ralph types)
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
  priority: "CRITICAL" | "BUG" | "QUICK_WIN" | "NORMAL";
}
