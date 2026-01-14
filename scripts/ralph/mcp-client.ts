/**
 * Ralph MCP Client
 * Wrapper for Jules MCP tools and CLI commands
 */

import { execSync } from "child_process";
import type { JulesSession, JulesSessionDetails, JulesStatus } from "./types";

// ============================================================================
// Jules CLI Commands (for operations that CLI supports)
// ============================================================================

/**
 * List all Jules sessions using CLI
 * Returns parsed session data
 */
export async function listJulesSessions(): Promise<JulesSession[]> {
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
 */
export async function createJulesSession(
  issueNumber: number,
  repo: string = "zerdos/spike-land-nextjs",
): Promise<string | null> {
  try {
    // Get issue body
    const issueBody = execSync(
      `gh issue view ${issueNumber} --repo ${repo} --json title,body -q '.title + "\\n\\n" + .body'`,
      { encoding: "utf-8", timeout: 10000 },
    );

    // Create Jules session
    const result = execSync(
      `echo "${escapeForShell(issueBody)}" | jules new --repo ${repo}`,
      { encoding: "utf-8", timeout: 60000 },
    );

    // Extract session ID from output
    const idMatch = result.match(/(\d{15,})/);
    return idMatch && idMatch[1] ? idMatch[1] : null;
  } catch (error) {
    console.error(`Failed to create Jules session for issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Teleport (apply) a completed Jules session locally
 */
export async function teleportSession(sessionId: string): Promise<boolean> {
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

  // Fall back to CLI
  console.log("MCP unavailable, falling back to Jules CLI...");
  const sessions = await listJulesSessions();

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
 */
export function getPRHealth(prNumber: number): string {
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
  } catch (error) {
    return JSON.stringify([]);
  }
}

/**
 * Get available issues
 */
export function getAvailableIssues(excludeIssues: string[] = []): string {
  try {
    const exclude = excludeIssues.join(" ");
    return execSync(`yarn ralph:available-issues ${exclude}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (error) {
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
 */
export function createPR(title: string, body: string): string | null {
  try {
    const result = execSync(
      `gh pr create --title "${escapeForShell(title)}" --body "${escapeForShell(body)}"`,
      { encoding: "utf-8", timeout: 60000 },
    );
    // Extract PR URL
    const urlMatch = result.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/);
    return urlMatch ? urlMatch[0] : null;
  } catch (error) {
    console.error("Failed to create PR:", error);
    return null;
  }
}

/**
 * Merge PR
 */
export function mergePR(prNumber: number): boolean {
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
 */
export function publishPR(prNumber: number): boolean {
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

// ============================================================================
// Utility Functions
// ============================================================================

function escapeForShell(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}
