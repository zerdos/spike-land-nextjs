/**
 * Ralph Registry Parser
 * Parse and update ralph-loop.local.md
 */

import { readFileSync, writeFileSync } from "fs";
import type { PipelineTracking, RalphConfig, RalphRegistry, TaskEntry, TaskStatus } from "./types";

const REGISTRY_PATH = "content/ralph-loop.local.md";

// ============================================================================
// Parse Registry
// ============================================================================

export async function parseRegistry(
  path: string = REGISTRY_PATH,
): Promise<RalphRegistry> {
  const content = readFileSync(path, "utf-8");

  // Parse YAML frontmatter
  const frontmatter = parseFrontmatter(content);

  // Parse config from markdown tables
  const config = parseConfig(content);

  // Parse active tasks from registry table
  const activeTasks = parseActiveTasksTable(content);

  // Parse pipeline tracking
  const pipelineTracking = parsePipelineTracking(content);

  return {
    active: (frontmatter.active as boolean) ?? true,
    iteration: (frontmatter.iteration as number) ?? 0,
    max_iterations: (frontmatter.max_iterations as number) ?? 2000,
    completion_promise: (frontmatter.completion_promise as string) ?? "WORKFORCE_IDLE",
    started_at: (frontmatter.started_at as string) ?? new Date().toISOString(),
    daily_sessions_used: (frontmatter.daily_sessions_used as number) ?? 0,
    daily_session_limit: (frontmatter.daily_session_limit as number) ?? 100,
    config,
    activeTasks,
    pipelineTracking,
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

function parseActiveTasksTable(content: string): TaskEntry[] {
  const tasks: TaskEntry[] = [];

  // Find the Active Task Registry table
  const tableMatch = content.match(
    /## Active Task Registry[\s\S]*?\|([\s\S]*?)\n\n\*\*Active Count/,
  );
  if (!tableMatch || !tableMatch[1]) return tasks;

  const tableContent = tableMatch[1];
  const lines = tableContent.split("\n").filter((line) => line.startsWith("|"));

  // Skip header rows (Issue # | Session ID | Status | PR # | Retries | Last Updated)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cells.length >= 6) {
      const issue = cells[0];
      const sessionId = cells[1];
      const status = cells[2];
      const prNumber = cells[3];
      const retries = cells[4];
      const lastUpdated = cells[5];

      if (issue && sessionId && status && lastUpdated) {
        tasks.push({
          issue: issue.replace(/^#/, ""),
          sessionId,
          status: status as TaskStatus,
          prNumber: prNumber === "-" ? null : prNumber ?? null,
          retries: parseInt(retries ?? "0") || 0,
          lastUpdated,
        });
      }
    }
  }

  return tasks;
}

function parsePipelineTracking(content: string): PipelineTracking {
  // Find Pipeline Tracking table
  const tableMatch = content.match(
    /### Pipeline Tracking[\s\S]*?\|([\s\S]*?)\n\n\*\*Pipeline Rules/,
  );

  if (!tableMatch) {
    return { batchA: null, batchB: null };
  }

  // For now, return empty tracking - will be populated by iteration
  return { batchA: null, batchB: null };
}

// ============================================================================
// Update Registry
// ============================================================================

export interface RegistryUpdate {
  iteration?: number;
  daily_sessions_used?: number;
  activeTasks?: TaskEntry[];
  pipelineTracking?: PipelineTracking;
}

export async function updateRegistry(
  path: string = REGISTRY_PATH,
  updates: RegistryUpdate,
): Promise<void> {
  let content = readFileSync(path, "utf-8");

  // Update frontmatter
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

  // Update active tasks table
  if (updates.activeTasks) {
    content = updateActiveTasksTable(content, updates.activeTasks);
  }

  // Update pipeline tracking
  if (updates.pipelineTracking) {
    content = updatePipelineTracking(content, updates.pipelineTracking);
  }

  writeFileSync(path, content);
}

function updateActiveTasksTable(
  content: string,
  tasks: TaskEntry[],
): string {
  // Find the table section
  const tableStart = content.indexOf("## Active Task Registry");
  const tableEnd = content.indexOf("**Active Count:");

  if (tableStart === -1 || tableEnd === -1) return content;

  // Build new table
  const header = `## Active Task Registry

<!-- Ralph: UPDATE THIS EVERY ITERATION! This is your memory. -->

| Issue #        | Session ID           | Status             | PR # | Retries | Last Updated     |
| -------------- | -------------------- | ------------------ | ---- | ------- | ---------------- |
`;

  const rows = tasks
    .map(
      (t) =>
        `| ${t.issue.startsWith("#") ? t.issue : "#" + t.issue} | ${t.sessionId} | ${t.status} | ${
          t.prNumber || "-"
        } | ${t.retries} | ${t.lastUpdated} |`,
    )
    .join("\n");

  // Calculate counts
  const activeCount = tasks.length;
  const completedAwaitPr = tasks.filter(
    (t) => t.status === "COMPLETED→AWAIT_PR",
  ).length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const planning = tasks.filter((t) => t.status === "PLANNING").length;
  const reviewChanges = tasks.filter(
    (t) =>
      t.status === "REVIEW_CHANGES_REQUESTED" ||
      t.status === "REVIEW_CHANGES_REQ",
  ).length;

  const summary = `

**Active Count: ${activeCount}/15** (${
    15 - activeCount
  } slots available) | **Daily: [daily_sessions_used]/100 sessions used**

- **${completedAwaitPr} COMPLETED→AWAIT_PR**
- **${inProgress} IN_PROGRESS**
- **${planning} PLANNING**
- **${reviewChanges} REVIEW_CHANGES_REQ**
`;

  const newTable = header + rows + summary;

  // Find where to insert (after Active Task Registry, before next section)
  const sectionEnd = content.indexOf("\n\n**Completed Sessions", tableStart);
  if (sectionEnd === -1) return content;

  return (
    content.slice(0, tableStart) + newTable + content.slice(sectionEnd)
  );
}

function updatePipelineTracking(
  content: string,
  tracking: PipelineTracking,
): string {
  // Find Pipeline Tracking table
  const startMarker = "### Pipeline Tracking";
  const endMarker = "**Pipeline Rules:**";

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) return content;

  const formatBatch = (batch: typeof tracking.batchA) => {
    if (!batch) return "| -        | -      | -       | -             |";
    return `| ${
      batch.sessions.join(",")
    } | ${batch.status} | ${batch.started} | ${batch.estComplete} |`;
  };

  const newTracking = `### Pipeline Tracking

| Batch | Sessions | Status | Started | Est. Complete |
| ----- | -------- | ------ | ------- | ------------- |
| A     ${formatBatch(tracking.batchA)}
| B     ${formatBatch(tracking.batchB)}

`;

  return (
    content.slice(0, startIndex) + newTracking + content.slice(endIndex)
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}

export function countActiveSlots(tasks: TaskEntry[]): number {
  const activeStatuses: TaskStatus[] = [
    "PLANNING",
    "AWAITING_PLAN_APPROVAL",
    "IN_PROGRESS",
  ];
  return tasks.filter((t) => activeStatuses.includes(t.status)).length;
}

export function countBacklog(tasks: TaskEntry[]): number {
  return tasks.filter((t) => t.status === "COMPLETED→AWAIT_PR").length;
}

export function sortTasksByAge(tasks: TaskEntry[]): TaskEntry[] {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.lastUpdated).getTime();
    const dateB = new Date(b.lastUpdated).getTime();
    return dateA - dateB; // Oldest first
  });
}
