/**
 * Admin Agents Git Info API
 *
 * GET - Get current git repository info
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { tryCatch } from "@/lib/try-catch";
import { exec } from "child_process";
import { NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

interface GitInfo {
  repository: string;
  branch: string;
  baseBranch: string;
  changedFiles: Array<{ path: string; status: string; }>;
  uncommittedChanges: number;
  aheadBy: number;
  behindBy: number;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
}

async function runGitCommand(command: string): Promise<string> {
  const cwd = process.cwd();
  const { stdout } = await execAsync(command, { cwd });
  return stdout.trim();
}

async function getGitInfo(): Promise<GitInfo> {
  // Get repository name
  let repository = "";
  try {
    const remoteUrl = await runGitCommand("git remote get-url origin");
    // Parse owner/repo from URL
    const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
    repository = match?.[1] || remoteUrl;
  } catch {
    repository = "unknown";
  }

  // Get current branch
  let branch = "";
  try {
    branch = await runGitCommand("git branch --show-current");
  } catch {
    branch = "unknown";
  }

  // Get base branch (main or master)
  const baseBranch = "main";

  // Get changed files
  let changedFiles: GitInfo["changedFiles"] = [];
  try {
    const status = await runGitCommand("git status --porcelain");
    if (status) {
      changedFiles = status.split("\n").map((line) => {
        const statusCode = line.substring(0, 2).trim();
        const path = line.substring(3);
        let statusLabel = "modified";
        if (statusCode.includes("A") || statusCode === "??") {
          statusLabel = "added";
        } else if (statusCode.includes("D")) {
          statusLabel = "deleted";
        } else if (statusCode.includes("R")) {
          statusLabel = "renamed";
        }
        return { path, status: statusLabel };
      });
    }
  } catch {
    // Ignore
  }

  const uncommittedChanges = changedFiles.length;

  // Get ahead/behind count
  let aheadBy = 0;
  let behindBy = 0;
  try {
    await runGitCommand("git fetch origin --quiet");
    const aheadBehind = await runGitCommand(
      `git rev-list --left-right --count ${baseBranch}...HEAD`,
    );
    const [behind, ahead] = aheadBehind.split("\t").map(Number);
    behindBy = behind || 0;
    aheadBy = ahead || 0;
  } catch {
    // Ignore - might not have remote tracking
  }

  // Get last commit
  let lastCommit: GitInfo["lastCommit"] = null;
  try {
    const commitInfo = await runGitCommand(
      'git log -1 --format="%H|%s|%an|%ci"',
    );
    if (commitInfo) {
      const [hash, message, author, date] = commitInfo.split("|");
      lastCommit = {
        hash: hash.substring(0, 7),
        message,
        author,
        date,
      };
    }
  } catch {
    // Ignore
  }

  return {
    repository,
    branch,
    baseBranch,
    changedFiles,
    uncommittedChanges,
    aheadBy,
    behindBy,
    lastCommit,
  };
}

/**
 * GET /api/admin/agents/git
 * Get current git repository info
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: gitInfo, error: gitError } = await tryCatch(getGitInfo());

  if (gitError) {
    console.error("Failed to get git info:", gitError);
    return NextResponse.json(
      { error: "Failed to get git info" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...gitInfo,
    timestamp: new Date().toISOString(),
  });
}
