/**
 * Ralph MCP Client
 * Wrapper for Jules MCP tools and CLI commands
 */

import { execSync, spawnSync } from "child_process";
import type { JulesSession, JulesSessionDetails, JulesStatus } from "./types";
import { isNumericIssue, validateIssueNumber, validateRepoFormat } from "./utils";

// ============================================================================
// Jules CLI Commands (for operations that CLI supports)
// ============================================================================

/**
 * List all Jules sessions using CLI
 * Returns parsed session data
 */
export function listJulesSessions(): JulesSession[] {
  try {
    const output = execSync("jules remote list --session", {
      encoding: "utf-8",
      timeout: 30000,
    });
    return parseJulesListOutput(output);
  } catch (error) {
    console.error("Failed to list Jules sessions:", error);
    return [];
  }
}

/**
 * Parse the output from `jules remote list --session`
 */
function parseJulesListOutput(output: string): JulesSession[] {
  const sessions: JulesSession[] = [];

  // Jules CLI outputs a formatted table or JSON
  // Try JSON first
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => ({
        id: s.id || s.session_id,
        title: s.title || s.name,
        status: mapJulesStatus(s.status),
        createdAt: s.created_at || s.createdAt,
        sourceRepo: s.source_repo,
        prUrl: s.pr_url,
      }));
    }
  } catch {
    // Not JSON, parse text output
  }

  // Parse text output (table format)
  const lines = output.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    // Skip header lines
    if (line.includes("Session ID") || line.startsWith("---")) continue;

    // Parse line - format varies, try common patterns
    const idMatch = line.match(/(\d{15,})/);
    const statusMatch = line.match(
      /(QUEUED|PLANNING|AWAITING_PLAN_APPROVAL|AWAITING_USER_FEEDBACK|IN_PROGRESS|COMPLETED|FAILED)/i,
    );

    if (idMatch && idMatch[1]) {
      sessions.push({
        id: idMatch[1],
        title: line.replace(idMatch[0], "").trim(),
        status: statusMatch && statusMatch[1]
          ? mapJulesStatus(statusMatch[1].toUpperCase())
          : "PLANNING",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return sessions;
}

function mapJulesStatus(status: string): JulesStatus {
  const statusMap: Record<string, JulesStatus> = {
    QUEUED: "QUEUED",
    PLANNING: "PLANNING",
    AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL",
    AWAITING_USER_FEEDBACK: "AWAITING_USER_FEEDBACK",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  };
  return statusMap[status.toUpperCase()] || "PLANNING";
}

/**
 * Create a new Jules session from an issue
 * SECURITY: Validates inputs before shell execution to prevent command injection
 */
export function createJulesSession(
  issueNumber: number,
  repo: string = "zerdos/spike-land-nextjs",
): string | null {
  // Validate inputs to prevent command injection
  if (!validateIssueNumber(issueNumber)) {
    console.error(`Invalid issue number: ${issueNumber}`);
    return null;
  }
  if (!validateRepoFormat(repo)) {
    console.error(`Invalid repo format: ${repo}`);
    return null;
  }

  try {
    // Get issue body using validated parameters
    const issueBody = execSync(
      `gh issue view ${issueNumber} --repo ${repo} --json title,body -q '.title + "\\n\\n" + .body'`,
      { encoding: "utf-8", timeout: 10000 },
    );

    // Create Jules session using stdin instead of shell echo to prevent injection
    const result = spawnSync("jules", ["new", "--repo", repo], {
      input: issueBody,
      encoding: "utf-8",
      timeout: 60000,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error(`Jules command failed with exit code ${result.status}: ${result.stderr}`);
      return null;
    }

    // Extract session ID from output
    const output = result.stdout;
    const idMatch = output.match(/(\d{15,})/);
    return idMatch && idMatch[1] ? idMatch[1] : null;
  } catch (error) {
    console.error(`Failed to create Jules session for issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Teleport (apply) a completed Jules session locally
 * SECURITY: Validates session ID format before shell execution
 */
export function teleportSession(sessionId: string): boolean {
  // Validate session ID is numeric (Jules session IDs are 15+ digit numbers)
  if (!/^\d{15,}$/.test(sessionId)) {
    console.error(`Invalid session ID format: ${sessionId}`);
    return false;
  }

  try {
    execSync(`jules teleport ${sessionId}`, {
      encoding: "utf-8",
      timeout: 120000,
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.error(`Failed to teleport session ${sessionId}:`, error);
    return false;
  }
}

/**
 * Result of a teleport and merge operation
 */
export interface TeleportMergeResult {
  success: boolean;
  conflict: boolean;
  message: string;
}

/**
 * Teleport a session and merge the latest main branch
 * Handles conflicts by pushing them back to the session
 */
export function teleportAndMerge(sessionId: string): TeleportMergeResult {
  // 1. Teleport the session
  if (!teleportSession(sessionId)) {
    return {
      success: false,
      conflict: false,
      message: "Failed to teleport session",
    };
  }

  try {
    // 2. Fetch latest main
    console.log("   🔄 Fetching origin main...");
    execSync("git fetch origin main", { encoding: "utf-8", timeout: 30000 });

    // 3. Attempt merge
    console.log("   🔀 Merging origin/main...");
    try {
      execSync("git merge origin/main --no-edit", {
        encoding: "utf-8",
        timeout: 30000,
      });
      return {
        success: true,
        conflict: false,
        message: "Successfully merged main",
      };
    } catch (mergeError) {
      // Merge failed - likely conflict
      console.log("   ⚠️ Merge conflict detected");

      // Check if it's actually a conflict
      const status = execSync("git status --porcelain", { encoding: "utf-8" });
      if (status.includes("UU ")) {
        // Unmerged paths exist
        return {
          success: false,
          conflict: true,
          message: "Merge conflict detected. Please resolve the conflicts in the codebase.",
        };
      }

      throw mergeError;
    }
  } catch (error) {
    return {
      success: false,
      conflict: false,
      message: `Merge failed: ${error}`,
    };
  }
}

// ============================================================================
// MCP Tool Invocations (for operations that CLI doesn't support)
// These call the MCP tools via the spike.land API
// ============================================================================

const SPIKE_LAND_API_URL = process.env.SPIKE_LAND_API_URL || "https://testing.spike.land";
const SPIKE_LAND_API_KEY = process.env.SPIKE_LAND_API_KEY || "";

interface MCPResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List Jules sessions via MCP (with optional status filter)
 */
export async function mcpListSessions(
  status?: JulesStatus,
): Promise<MCPResponse<JulesSession[]>> {
  try {
    const params = status ? `?status=${status}` : "";
    const response = await fetch(
      `${SPIKE_LAND_API_URL}/api/jules/sessions${params}`,
      {
        headers: {
          Authorization: `Bearer ${SPIKE_LAND_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Approve a Jules plan via MCP
 */
export async function mcpApprovePlan(
  sessionId: string,
): Promise<MCPResponse<void>> {
  try {
    const response = await fetch(
      `${SPIKE_LAND_API_URL}/api/jules/sessions/${sessionId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SPIKE_LAND_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send a message to a Jules session via MCP
 */
export async function mcpSendMessage(
  sessionId: string,
  message: string,
): Promise<MCPResponse<void>> {
  try {
    const response = await fetch(
      `${SPIKE_LAND_API_URL}/api/jules/sessions/${sessionId}/message`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SPIKE_LAND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get session details via MCP
 */
export async function mcpGetSession(
  sessionId: string,
): Promise<MCPResponse<JulesSessionDetails>> {
  try {
    const response = await fetch(
      `${SPIKE_LAND_API_URL}/api/jules/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${SPIKE_LAND_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Unified Interface (tries MCP first, falls back to CLI)
// ============================================================================

/**
 * List sessions - tries MCP API, falls back to CLI
 */
export async function listSessions(
  status?: JulesStatus,
): Promise<JulesSession[]> {
  // Try MCP first
  const mcpResult = await mcpListSessions(status);
  if (mcpResult.success && mcpResult.data) {
    return mcpResult.data;
  }

  // Fall back to CLI (synchronous)
  console.log("MCP unavailable, falling back to Jules CLI...");
  const sessions = listJulesSessions();

  // Filter by status if needed
  if (status) {
    return sessions.filter((s) => s.status === status);
  }
  return sessions;
}

/**
 * Approve plan - tries MCP API first
 */
export async function approvePlan(sessionId: string): Promise<boolean> {
  const result = await mcpApprovePlan(sessionId);
  if (!result.success) {
    console.error(`Failed to approve plan ${sessionId}: ${result.error}`);
  }
  return result.success;
}

/**
 * Send message - uses MCP API
 */
export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<boolean> {
  const result = await mcpSendMessage(sessionId, message);
  if (!result.success) {
    console.error(`Failed to send message to ${sessionId}: ${result.error}`);
  }
  return result.success;
}

/**
 * Get session details - tries MCP API first
 */
export async function getSessionDetails(
  sessionId: string,
): Promise<JulesSessionDetails | null> {
  const result = await mcpGetSession(sessionId);
  if (result.success && result.data) {
    return result.data;
  }
  return null;
}

// ============================================================================
// GitHub CLI Helpers (for PR/Issue operations)
// ============================================================================

/**
 * Get PR health metrics
 * SECURITY: Validates PR number before shell execution
 */
export function getPRHealth(prNumber: number): string {
  // Validate PR number
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    return JSON.stringify({ error: `Invalid PR number: ${prNumber}` });
  }

  try {
    return execSync(`yarn ralph:pr-health ${prNumber}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (error) {
    return JSON.stringify({ error: String(error) });
  }
}

/**
 * Get batch PR status
 */
export function getBatchPRStatus(): string {
  try {
    return execSync("yarn ralph:batch-pr-status", {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (_error) {
    return JSON.stringify([]);
  }
}

/**
 * Get available issues
 * SECURITY: Validates exclude list contains only numeric issue numbers
 */
export function getAvailableIssues(excludeIssues: string[] = []): string {
  try {
    // Filter to only allow numeric issue numbers to prevent injection
    const validatedExcludes = excludeIssues
      .filter(isNumericIssue)
      .join(" ");

    return execSync(`yarn ralph:available-issues ${validatedExcludes}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (_error) {
    return JSON.stringify([]);
  }
}

/**
 * Get CI status
 */
export function getCIStatus(): string {
  try {
    return execSync("yarn ralph:ci-status", {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (error) {
    return JSON.stringify({ status: "unknown", error: String(error) });
  }
}

/**
 * Create PR
 * SECURITY: Uses spawnSync with args array to prevent shell injection
 */
export function createPR(title: string, body: string): string | null {
  try {
    // Use spawnSync with args array to avoid shell injection
    const result = spawnSync("gh", ["pr", "create", "--title", title, "--body", body], {
      encoding: "utf-8",
      timeout: 60000,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error(`gh pr create failed with exit code ${result.status}: ${result.stderr}`);
      return null;
    }

    // Extract PR URL from output
    const output = result.stdout;
    const urlMatch = output.match(/https:\/\/github\.com\/[\w-]+\/[\w.-]+\/pull\/\d+/);
    return urlMatch ? urlMatch[0] : null;
  } catch (error) {
    console.error("Failed to create PR:", error);
    return null;
  }
}

/**
 * Merge PR
 * SECURITY: Validates PR number before shell execution
 */
export function mergePR(prNumber: number): boolean {
  // Validate PR number
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error(`Invalid PR number: ${prNumber}`);
    return false;
  }

  try {
    execSync(`gh pr merge ${prNumber} --squash --delete-branch`, {
      encoding: "utf-8",
      timeout: 60000,
    });
    return true;
  } catch (error) {
    console.error(`Failed to merge PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Publish (un-draft) PR
 * SECURITY: Validates PR number before shell execution
 */
export function publishPR(prNumber: number): boolean {
  // Validate PR number
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error(`Invalid PR number: ${prNumber}`);
    return false;
  }

  try {
    execSync(`gh pr ready ${prNumber}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return true;
  } catch (error) {
    console.error(`Failed to publish PR #${prNumber}:`, error);
    return false;
  }
}
