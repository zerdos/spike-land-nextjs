/**
 * Ralph Registry Parser
 * Parse config from ralph-loop.local.md
 *
 * NOTE: This file only parses CONFIG. All session state is fetched
 * live from Jules API by mcp-client.ts - no state stored in markdown.
 */

import { readFileSync, writeFileSync } from "fs";
import type { RalphConfig, RalphRegistry } from "./types";

const REGISTRY_PATH = "content/ralph-loop.local.md";

// ============================================================================
// Parse Registry (Config Only)
// ============================================================================

export async function parseRegistry(
  path: string = REGISTRY_PATH,
): Promise<RalphRegistry> {
  const content = readFileSync(path, "utf-8");

  // Parse YAML frontmatter
  const frontmatter = parseFrontmatter(content);

  // Parse config from markdown tables
  const config = parseConfig(content);

  return {
    active: (frontmatter["active"] as boolean) ?? true,
    iteration: (frontmatter["iteration"] as number) ?? 0,
    max_iterations: (frontmatter["max_iterations"] as number) ?? 2000,
    completion_promise: (frontmatter["completion_promise"] as string) ?? "WORKFORCE_IDLE",
    started_at: (frontmatter["started_at"] as string) ?? new Date().toISOString(),
    daily_sessions_used: (frontmatter["daily_sessions_used"] as number) ?? 0,
    daily_session_limit: (frontmatter["daily_session_limit"] as number) ?? 100,
    config,
    // State is fetched live from Jules API - not stored here
    activeTasks: [],
    pipelineTracking: { batchA: null, batchB: null },
  };
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match || !match[1]) return {};

  const yaml = match[1];
  const result: Record<string, unknown> = {};

  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Parse value types
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value as string)) value = parseInt(value as string);
    else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      value = (value as string).slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function parseConfig(content: string): RalphConfig {
  // Extract WIP_LIMIT from config table
  const wipMatch = content.match(/WIP_LIMIT\s*\|\s*\*\*(\d+)\*\*/);
  const wip_limit = wipMatch && wipMatch[1] ? parseInt(wipMatch[1]) : 15;

  // Extract work streams from table
  const featuresMatch = content.match(/Features\s*\|\s*(\d+)/);
  const testingMatch = content.match(/Testing\s*\|\s*(\d+)/);
  const bugsMatch = content.match(/Bug Fixes\s*\|\s*(\d+)/);
  const debtMatch = content.match(/Tech Debt\s*\|\s*(\d+)/);
  const experimentsMatch = content.match(/Experiments\s*\|\s*(\d+)/);

  return {
    wip_limit,
    auto_approve: content.includes("AUTO_APPROVE | **MCP**"),
    auto_merge: content.includes("AUTO_MERGE   | true"),
    auto_publish: content.includes("AUTO_PUBLISH | **true**"),
    max_retries: 2,
    repo: "zerdos/spike-land-nextjs",
    cli_mode: content.includes("CLI_MODE     | **true**"),
    work_streams: {
      features: featuresMatch && featuresMatch[1] ? parseInt(featuresMatch[1]) : 5,
      testing: testingMatch && testingMatch[1] ? parseInt(testingMatch[1]) : 4,
      bugs: bugsMatch && bugsMatch[1] ? parseInt(bugsMatch[1]) : 3,
      debt: debtMatch && debtMatch[1] ? parseInt(debtMatch[1]) : 2,
      experiments: experimentsMatch && experimentsMatch[1] ? parseInt(experimentsMatch[1]) : 1,
    },
  };
}

// ============================================================================
// Update Registry (Frontmatter Only)
// ============================================================================

export interface RegistryUpdate {
  iteration?: number;
  daily_sessions_used?: number;
}

export async function updateRegistry(
  path: string = REGISTRY_PATH,
  updates: RegistryUpdate,
): Promise<void> {
  let content = readFileSync(path, "utf-8");

  // Update frontmatter only
  if (updates.iteration !== undefined) {
    content = content.replace(
      /iteration: \d+/,
      `iteration: ${updates.iteration}`,
    );
  }

  if (updates.daily_sessions_used !== undefined) {
    content = content.replace(
      /daily_sessions_used: \d+/,
      `daily_sessions_used: ${updates.daily_sessions_used}`,
    );
  }

  writeFileSync(path, content);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}

/**
 * Count active slots (tasks currently using Jules capacity)
 * Works on task arrays from any source (API or otherwise)
 */
export function countActiveSlots(tasks: Array<{ status: string; }>): number {
  const activeStatuses = ["PLANNING", "AWAITING_PLAN_APPROVAL", "IN_PROGRESS"];
  return tasks.filter((t) => activeStatuses.includes(t.status)).length;
}

/**
 * Count tasks waiting for PR creation
 */
export function countBacklog(tasks: Array<{ status: string; }>): number {
  return tasks.filter((t) => t.status === "COMPLETED→AWAIT_PR").length;
}

/**
 * Sort tasks by last updated (oldest first)
 */
export function sortTasksByAge<T extends { lastUpdated: string; }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.lastUpdated).getTime();
    const dateB = new Date(b.lastUpdated).getTime();
    return dateA - dateB; // Oldest first
  });
}
