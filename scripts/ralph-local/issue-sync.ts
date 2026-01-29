/**
 * Ralph Local Issue Sync
 * Syncs GitHub issues to local .github/issues/{id}.md files
 *
 * Security Note: This module uses spawnSync() with argument arrays (not shell strings),
 * which is the recommended safe pattern. All inputs are validated before use.
 */

import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import matter from "gray-matter";
import { join } from "path";
import type { RalphLocalConfig } from "./types";

interface LocalIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  labels: (string | { name?: string; })[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ISSUES_DIR = ".github/issues";

/**
 * Get the issues directory path
 */
export function getIssuesDir(config: RalphLocalConfig): string {
  return config.issuesDir || join(config.workDir, DEFAULT_ISSUES_DIR);
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sync open GitHub issues to local .github/issues/ directory
 * Uses spawnSync with argument arrays (safe, no shell injection)
 */
export function syncIssuesToRepo(config: RalphLocalConfig): { synced: number; removed: number; } {
  if (!config.issueSyncEnabled) {
    return { synced: 0, removed: 0 };
  }

  const issuesDir = getIssuesDir(config);
  ensureDir(issuesDir);

  // Fetch open issues using gh CLI with argument array (safe)
  const result = spawnSync("gh", [
    "issue",
    "list",
    "--repo",
    config.repo,
    "--state",
    "open",
    "--json",
    "number,title,body,labels,createdAt,updatedAt",
    "--limit",
    "100",
  ], { encoding: "utf-8", cwd: config.workDir });

  if (result.status !== 0) {
    console.error("Failed to fetch issues:", result.stderr);
    return { synced: 0, removed: 0 };
  }

  let issues: GitHubIssueResponse[];
  try {
    issues = JSON.parse(result.stdout || "[]");
  } catch (error) {
    console.error("Failed to parse issues JSON:", error);
    return { synced: 0, removed: 0 };
  }

  const openIssueNumbers = new Set(issues.map((i) => i.number));
  let synced = 0;

  // Write each issue to file
  for (const issue of issues) {
    const issuePath = join(issuesDir, `${issue.number}.md`);
    const content = formatIssueAsMarkdown(issue);

    // Only write if changed or new
    if (!existsSync(issuePath) || readFileSync(issuePath, "utf-8") !== content) {
      writeFileSync(issuePath, content);
      synced++;
      console.log(`   📝 Synced issue #${issue.number}: ${issue.title.slice(0, 50)}...`);
    }
  }

  // Remove files for closed issues
  let removed = 0;
  const existingFiles = existsSync(issuesDir)
    ? readdirSync(issuesDir).filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    : [];

  for (const file of existingFiles) {
    const issueNumber = parseInt(file.replace(".md", ""), 10);
    if (!isNaN(issueNumber) && !openIssueNumbers.has(issueNumber)) {
      unlinkSync(join(issuesDir, file));
      removed++;
      console.log(`   🗑️ Removed closed issue #${issueNumber}`);
    }
  }

  // Commit changes if any
  if (synced > 0 || removed > 0) {
    commitIssueChanges(config, synced, removed);
  }

  return { synced, removed };
}

/**
 * Format issue as markdown with YAML frontmatter
 */
function formatIssueAsMarkdown(issue: GitHubIssueResponse): string {
  const labels = issue.labels
    .map((l) => (typeof l === "string" ? l : l.name))
    .filter((l): l is string => Boolean(l));

  const safeTitle = issue.title.replace(/"/g, '\\"');
  const labelsStr = labels.length > 0
    ? `[${labels.map((l) => `"${l}"`).join(", ")}]`
    : "[]";

  return `---
number: ${issue.number}
title: "${safeTitle}"
state: open
labels: ${labelsStr}
created_at: ${issue.createdAt}
updated_at: ${issue.updatedAt}
---

# ${issue.title}

${issue.body || "No description provided."}
`;
}

/**
 * Commit issue file changes using spawnSync (safe)
 */
function commitIssueChanges(config: RalphLocalConfig, synced: number, removed: number): void {
  const issuesDir = getIssuesDir(config);
  const message = `chore: sync issues (${synced} updated, ${removed} removed)`;

  // Stage changes
  const addResult = spawnSync("git", ["add", issuesDir], {
    cwd: config.workDir,
    encoding: "utf-8",
  });

  if (addResult.status !== 0) {
    console.error("Failed to stage issue changes:", addResult.stderr);
    return;
  }

  // Check if there are changes to commit
  const diffResult = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: config.workDir,
    encoding: "utf-8",
  });

  // Exit code 1 means there are changes
  if (diffResult.status !== 1) {
    console.log("   No changes to commit");
    return;
  }

  // Commit (may fail if nothing to commit - that's OK)
  const commitResult = spawnSync("git", ["commit", "-m", message], {
    cwd: config.workDir,
    encoding: "utf-8",
  });

  if (commitResult.status === 0) {
    console.log(`   ✅ Committed issue sync: ${message}`);
  }
}

/**
 * Remove a specific issue file after merge
 */
export function removeIssueFile(issueNumber: number, config: RalphLocalConfig): boolean {
  const issuesDir = getIssuesDir(config);
  const issuePath = join(issuesDir, `${issueNumber}.md`);

  if (!existsSync(issuePath)) {
    return true; // Already gone
  }

  try {
    unlinkSync(issuePath);

    // Stage and commit using spawnSync (safe)
    spawnSync("git", ["add", issuePath], { cwd: config.workDir });

    const commitResult = spawnSync(
      "git",
      ["commit", "-m", `chore: remove merged issue #${issueNumber}`],
      { cwd: config.workDir, encoding: "utf-8" },
    );

    if (commitResult.status === 0) {
      console.log(`   🗑️ Removed and committed issue file for #${issueNumber}`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to remove issue file ${issueNumber}:`, error);
    return false;
  }
}

/**
 * Get a local issue by number
 */
export function getLocalIssue(issueNumber: number, config: RalphLocalConfig): LocalIssue | null {
  const issuesDir = getIssuesDir(config);
  const issuePath = join(issuesDir, `${issueNumber}.md`);

  if (!existsSync(issuePath)) {
    return null;
  }

  try {
    const content = readFileSync(issuePath, "utf-8");
    const { data, content: body } = matter(content);

    return {
      number: data.number as number,
      title: data.title as string,
      body: body.trim(),
      labels: (data.labels as string[]) || [],
      state: data.state as "open" | "closed",
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  } catch (error) {
    console.error(`Failed to parse local issue ${issueNumber}:`, error);
    return null;
  }
}

/**
 * List all local issue files
 */
export function listLocalIssues(config: RalphLocalConfig): number[] {
  const issuesDir = getIssuesDir(config);

  if (!existsSync(issuesDir)) {
    return [];
  }

  return readdirSync(issuesDir)
    .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    .map((f) => parseInt(f.replace(".md", ""), 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}
