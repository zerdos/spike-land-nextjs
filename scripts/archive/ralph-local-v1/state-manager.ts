/**
 * Ralph Local State Manager
 * Persists orchestrator state to .claude/ralph-local-state.json
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type {
  AgentPool,
  AgentRole,
  BlockedTicket,
  CodeWork,
  LocalAgent,
  MainBranchCIStatus,
  OrchestratorState,
  Plan,
  PRFixWork,
  RalphLocalConfig,
  ReviewWork,
} from "./types";

const STATE_VERSION = 1;
const STATE_FILE = ".claude/ralph-local-state.json";

/**
 * Get the full path to the state file
 */
export function getStatePath(workDir: string): string {
  return join(workDir, STATE_FILE);
}

/**
 * Create a fresh initial state
 */
export function createInitialState(config: RalphLocalConfig): OrchestratorState {
  const now = new Date().toISOString();

  // Initialize agent pools
  const pools: AgentPool = {
    planning: createAgentPool("planning", config.poolSizes.planning, config),
    developer: createAgentPool("developer", config.poolSizes.developer, config),
    reviewer: createAgentPool("reviewer", config.poolSizes.reviewer, config),
    tester: createAgentPool("tester", config.poolSizes.tester, config),
    fixer: createAgentPool("fixer", config.poolSizes.fixer, config),
  };

  return {
    version: STATE_VERSION,
    lastUpdated: now,
    iteration: 0,
    pools,
    pendingPlans: [],
    pendingReview: [],
    pendingCode: [],
    pendingPRFixes: [],
    completedTickets: [],
    failedTickets: [],
    blockedTickets: [],
    mainBranchStatus: null,
  };
}

/**
 * Create a pool of agents with the given role
 */
function createAgentPool(
  role: AgentRole,
  count: number,
  config: RalphLocalConfig,
): LocalAgent[] {
  const agents: LocalAgent[] = [];

  for (let i = 0; i < count; i++) {
    const id = `${role}-${i + 1}`;
    agents.push({
      id,
      role,
      pid: null,
      status: "idle",
      ticketId: null,
      worktree: null,
      outputFile: join(config.outputDir, `${id}.json`),
      pidFile: join(config.pidDir, `${id}.pid`),
      startedAt: null,
      lastHeartbeat: null,
      retries: 0,
    });
  }

  return agents;
}

/**
 * Load state from file, creating initial state if not exists
 */
export function loadState(config: RalphLocalConfig): OrchestratorState {
  const statePath = getStatePath(config.workDir);

  if (!existsSync(statePath)) {
    console.log("📄 No existing state found, creating initial state");
    const initialState = createInitialState(config);
    saveState(initialState, config);
    return initialState;
  }

  try {
    const content = readFileSync(statePath, "utf-8");
    const state: OrchestratorState = JSON.parse(content);

    // Check version compatibility
    if (state.version !== STATE_VERSION) {
      console.log(`⚠️ State version mismatch (${state.version} vs ${STATE_VERSION}), migrating...`);
      return migrateState(state, config);
    }

    // Ensure pools have correct sizes (in case config changed)
    state.pools = reconcilePools(state.pools, config);

    return state;
  } catch (error) {
    console.error("❌ Failed to load state, creating fresh state:", error);
    const initialState = createInitialState(config);
    saveState(initialState, config);
    return initialState;
  }
}

/**
 * Save state to file
 */
export function saveState(state: OrchestratorState, config: RalphLocalConfig): void {
  const statePath = getStatePath(config.workDir);
  const stateDir = dirname(statePath);

  // Ensure directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  // Update timestamp
  state.lastUpdated = new Date().toISOString();

  // Write atomically (write to temp, then rename)
  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2));

  // Rename for atomic write
  renameSync(tempPath, statePath);
}

/**
 * Migrate state from older version
 */
function migrateState(
  oldState: OrchestratorState,
  config: RalphLocalConfig,
): OrchestratorState {
  // For now, just create fresh state but preserve some data
  const freshState = createInitialState(config);

  // Preserve completed/failed tickets if they exist
  if (oldState.completedTickets) {
    freshState.completedTickets = oldState.completedTickets;
  }
  if (oldState.failedTickets) {
    freshState.failedTickets = oldState.failedTickets;
  }
  if (oldState.iteration) {
    freshState.iteration = oldState.iteration;
  }

  saveState(freshState, config);
  return freshState;
}

/**
 * Reconcile pools with config (add/remove agents as needed)
 */
function reconcilePools(pools: AgentPool, config: RalphLocalConfig): AgentPool {
  const reconciled: AgentPool = {
    planning: reconcilePool(pools.planning, "planning", config.poolSizes.planning, config),
    developer: reconcilePool(pools.developer, "developer", config.poolSizes.developer, config),
    reviewer: reconcilePool(pools.reviewer || [], "reviewer", config.poolSizes.reviewer, config),
    tester: reconcilePool(pools.tester, "tester", config.poolSizes.tester, config),
    fixer: reconcilePool(pools.fixer || [], "fixer", config.poolSizes.fixer, config),
  };
  return reconciled;
}

/**
 * Reconcile a single pool
 */
function reconcilePool(
  existing: LocalAgent[],
  role: AgentRole,
  targetCount: number,
  config: RalphLocalConfig,
): LocalAgent[] {
  // If we have the right count, return as-is
  if (existing.length === targetCount) {
    return existing;
  }

  // If we need more agents, add them
  if (existing.length < targetCount) {
    const result = [...existing];
    for (let i = existing.length; i < targetCount; i++) {
      const id = `${role}-${i + 1}`;
      result.push({
        id,
        role,
        pid: null,
        status: "idle",
        ticketId: null,
        worktree: null,
        outputFile: join(config.outputDir, `${id}.json`),
        pidFile: join(config.pidDir, `${id}.pid`),
        startedAt: null,
        lastHeartbeat: null,
        retries: 0,
      });
    }
    return result;
  }

  // If we have too many, remove idle ones first
  const result = [...existing];
  while (result.length > targetCount) {
    const idleIndex = result.findIndex((a) => a.status === "idle");
    if (idleIndex !== -1) {
      result.splice(idleIndex, 1);
    } else {
      // No idle agents, just trim from the end
      result.pop();
    }
  }

  return result;
}

// ============================================================================
// State Update Helpers
// ============================================================================

/**
 * Get all pools as an array for iteration
 */
function getAllPools(state: OrchestratorState): LocalAgent[][] {
  return [
    state.pools.planning,
    state.pools.developer,
    state.pools.reviewer,
    state.pools.tester,
    state.pools.fixer,
  ];
}

/**
 * Update an agent in the state
 */
export function updateAgent(
  state: OrchestratorState,
  agentId: string,
  updates: Partial<LocalAgent>,
): void {
  for (const pool of getAllPools(state)) {
    const agent = pool.find((a) => a.id === agentId);
    if (agent) {
      Object.assign(agent, updates);
      return;
    }
  }
}

/**
 * Get an agent by ID
 */
export function getAgent(state: OrchestratorState, agentId: string): LocalAgent | undefined {
  for (const pool of getAllPools(state)) {
    const agent = pool.find((a) => a.id === agentId);
    if (agent) {
      return agent;
    }
  }
  return undefined;
}

/**
 * Get idle agents of a specific role
 */
export function getIdleAgents(
  state: OrchestratorState,
  role: AgentRole,
): LocalAgent[] {
  return state.pools[role].filter((a) => a.status === "idle");
}

/**
 * Add a pending plan
 */
export function addPendingPlan(state: OrchestratorState, plan: Plan): void {
  state.pendingPlans.push(plan);
}

/**
 * Remove a pending plan
 */
export function removePendingPlan(state: OrchestratorState, ticketId: string): Plan | undefined {
  const index = state.pendingPlans.findIndex((p) => p.ticketId === ticketId);
  if (index !== -1) {
    return state.pendingPlans.splice(index, 1)[0];
  }
  return undefined;
}

/**
 * Add pending code work
 */
export function addPendingCode(state: OrchestratorState, code: CodeWork): void {
  state.pendingCode.push(code);
}

/**
 * Remove pending code work
 */
export function removePendingCode(
  state: OrchestratorState,
  ticketId: string,
): CodeWork | undefined {
  const index = state.pendingCode.findIndex((c) => c.ticketId === ticketId);
  if (index !== -1) {
    return state.pendingCode.splice(index, 1)[0];
  }
  return undefined;
}

// ============================================================================
// Review Work Management
// ============================================================================

/**
 * Add pending review work
 */
export function addPendingReview(state: OrchestratorState, review: ReviewWork): void {
  if (!state.pendingReview) {
    state.pendingReview = [];
  }
  state.pendingReview.push(review);
}

/**
 * Remove pending review work
 */
export function removePendingReview(
  state: OrchestratorState,
  ticketId: string,
): ReviewWork | undefined {
  if (!state.pendingReview) {
    return undefined;
  }
  const index = state.pendingReview.findIndex((r) => r.ticketId === ticketId);
  if (index !== -1) {
    return state.pendingReview.splice(index, 1)[0];
  }
  return undefined;
}

/**
 * Get pending review by ticket ID
 */
export function getPendingReview(
  state: OrchestratorState,
  ticketId: string,
): ReviewWork | undefined {
  return state.pendingReview?.find((r) => r.ticketId === ticketId);
}

/**
 * Check if a review is already in progress for a ticket
 */
export function isReviewInProgress(state: OrchestratorState, ticketId: string): boolean {
  // Check pending review queue
  if (state.pendingReview?.some((r) => r.ticketId === ticketId)) {
    return true;
  }

  // Check if any reviewer agent is working on this ticket
  for (const agent of state.pools.reviewer || []) {
    if (agent.status === "running" && agent.ticketId === ticketId) {
      return true;
    }
  }

  return false;
}

/**
 * Mark a ticket as completed
 */
export function markTicketCompleted(state: OrchestratorState, ticketId: string): void {
  if (!state.completedTickets.includes(ticketId)) {
    state.completedTickets.push(ticketId);
  }
}

/**
 * Mark a ticket as failed
 */
export function markTicketFailed(state: OrchestratorState, ticketId: string): void {
  if (!state.failedTickets.includes(ticketId)) {
    state.failedTickets.push(ticketId);
  }
}

/**
 * Add a blocked ticket
 */
export function addBlockedTicket(state: OrchestratorState, blocked: BlockedTicket): void {
  // Check if already blocked
  const existing = state.blockedTickets.find((b) => b.ticketId === blocked.ticketId);
  if (existing) {
    existing.retries = blocked.retries;
    existing.reason = blocked.reason;
    existing.blockedAt = blocked.blockedAt;
    existing.lastAttemptBy = blocked.lastAttemptBy;
  } else {
    state.blockedTickets.push(blocked);
  }
}

/**
 * Remove a blocked ticket
 */
export function removeBlockedTicket(state: OrchestratorState, ticketId: string): void {
  state.blockedTickets = state.blockedTickets.filter((b) => b.ticketId !== ticketId);
}

/**
 * Check if a ticket is already in progress
 */
export function isTicketInProgress(state: OrchestratorState, ticketId: string): boolean {
  // Check if any agent is working on this ticket
  for (const pool of getAllPools(state)) {
    if (pool.some((a) => a.ticketId === ticketId && a.status === "running")) {
      return true;
    }
  }

  // Check if in pending queues
  if (state.pendingPlans.some((p) => p.ticketId === ticketId)) {
    return true;
  }
  if (state.pendingReview?.some((r) => r.ticketId === ticketId)) {
    return true;
  }
  if (state.pendingCode.some((c) => c.ticketId === ticketId)) {
    return true;
  }
  if (state.pendingPRFixes?.some((f) => f.ticketId === ticketId)) {
    return true;
  }

  return false;
}

/**
 * Check if a ticket is completed or failed
 */
export function isTicketDone(state: OrchestratorState, ticketId: string): boolean {
  return (
    state.completedTickets.includes(ticketId) ||
    state.failedTickets.includes(ticketId)
  );
}

// ============================================================================
// PR Fix State Helpers
// ============================================================================

/**
 * Add a pending PR fix
 */
export function addPendingPRFix(state: OrchestratorState, prFix: PRFixWork): void {
  // Ensure array exists (for migrated states)
  if (!state.pendingPRFixes) {
    state.pendingPRFixes = [];
  }

  // Check if already exists
  const existing = state.pendingPRFixes.find((f) => f.prNumber === prFix.prNumber);
  if (existing) {
    // Update existing entry
    Object.assign(existing, prFix);
  } else {
    state.pendingPRFixes.push(prFix);
  }
}

/**
 * Remove a pending PR fix
 */
export function removePendingPRFix(
  state: OrchestratorState,
  prNumber: number,
): PRFixWork | undefined {
  if (!state.pendingPRFixes) {
    return undefined;
  }

  const index = state.pendingPRFixes.findIndex((f) => f.prNumber === prNumber);
  if (index !== -1) {
    return state.pendingPRFixes.splice(index, 1)[0];
  }
  return undefined;
}

/**
 * Get pending PR fix by PR number
 */
export function getPendingPRFix(
  state: OrchestratorState,
  prNumber: number,
): PRFixWork | undefined {
  return state.pendingPRFixes?.find((f) => f.prNumber === prNumber);
}

/**
 * Check if a PR fix is already in progress
 */
export function isPRFixInProgress(state: OrchestratorState, prNumber: number): boolean {
  // Check pending fixes queue
  if (state.pendingPRFixes?.some((f) => f.prNumber === prNumber)) {
    return true;
  }

  // Check if any fixer agent is working on this PR
  for (const agent of state.pools.fixer || []) {
    if (agent.status === "running" && agent.ticketId?.includes(`PR#${prNumber}`)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Main Branch CI Status Helpers
// ============================================================================

/**
 * Update main branch CI status
 */
export function updateMainBranchStatus(
  state: OrchestratorState,
  status: MainBranchCIStatus,
): void {
  state.mainBranchStatus = status;
}

/**
 * Get main branch CI status
 */
export function getMainBranchStatus(
  state: OrchestratorState,
): MainBranchCIStatus | null {
  return state.mainBranchStatus || null;
}

/**
 * Check if main branch is failing
 */
export function isMainBranchFailing(state: OrchestratorState): boolean {
  return state.mainBranchStatus?.status === "failing";
}
