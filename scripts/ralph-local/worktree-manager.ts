/**
 * Ralph Local Worktree Manager
 * Manages git worktrees for isolated ticket development
 *
 * Security Note: This module uses execSync with controlled inputs only (ticket IDs from
 * our state management). All ticket IDs are validated before use. This is an internal
 * orchestration tool, not exposed to user input.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "fs";
import { join } from "path";
import type { RalphLocalConfig } from "./types";
import { acquireFromPool, copyEnvLocal, recycleWorktree } from "./worktree-pool";

/**
 * Validate ticket ID format (must be # followed by digits only)
 */
function validateTicketId(ticketId: string): boolean {
  return /^#\d+$/.test(ticketId);
}

/**
 * Safe ticket ID for filesystem/git operations
 */
function safeTicketId(ticketId: string): string {
  if (!validateTicketId(ticketId)) {
    throw new Error(`Invalid ticket ID format: ${ticketId}`);
  }
  // Remove # and return just the number
  return ticketId.replace("#", "");
}

/**
 * Create a worktree for a specific ticket
 * Returns the worktree path
 *
 * This function first tries to acquire a pre-warmed worktree from the pool,
 * which has dependencies already installed. If the pool is empty, it falls
 * back to creating a fresh worktree (slower, requires yarn install).
 */
export function createWorktree(
  ticketId: string,
  config: RalphLocalConfig,
): string {
  const safeName = safeTicketId(ticketId);
  const worktreePath = getWorktreePath(ticketId, config);
  const branchName = getBranchName(ticketId);

  // Ensure base directory exists
  if (!existsSync(config.worktreeBase)) {
    mkdirSync(config.worktreeBase, { recursive: true });
  }

  // Check if worktree already exists
  if (existsSync(worktreePath)) {
    console.log(`   ⚠️ Worktree already exists, cleaning up first`);
    cleanupWorktree(ticketId, config);
  }

  // Try to acquire from pool first (instant!)
  const poolPath = acquireFromPool(ticketId, config);
  if (poolPath) {
    console.log(`   ⚡ Acquired warm worktree for ${ticketId}`);
    copyEnvLocal(poolPath, config);
    return poolPath;
  }

  // Fall back to fresh creation (slower - requires yarn install)
  console.log(`   📁 Creating fresh worktree for ${ticketId} (pool empty)`);

  try {
    // Fetch latest main first
    execSync("git fetch origin main", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
      shell: true,
    });

    // Create the worktree with a new branch based on main
    const worktreeCmd = `git worktree add -b ralph/${safeName} "${worktreePath}" origin/main`;
    execSync(worktreeCmd, {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
      shell: true,
    });

    console.log(`   ✅ Worktree created: ${worktreePath}`);

    // Install dependencies in the worktree
    console.log(`   📦 Installing dependencies...`);
    try {
      execSync("yarn install --immutable", {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: 300000, // 5 minutes for yarn install
        stdio: "pipe",
        shell: true,
    });
      console.log(`   ✅ Dependencies installed`);
    } catch {
      console.log(`   ⚠️ Dependency install failed, continuing anyway`);
    }

    // Copy .env.local after fresh creation too
    copyEnvLocal(worktreePath, config);

    return worktreePath;
  } catch (error) {
    // If branch already exists, try to use it
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log(`   ⚠️ Branch ${branchName} already exists, reusing...`);
      try {
        const reuseCmd = `git worktree add "${worktreePath}" ralph/${safeName}`;
        execSync(reuseCmd, {
          cwd: config.workDir,
          encoding: "utf-8",
          timeout: 60000,
          stdio: "pipe",
          shell: true,
    });
        copyEnvLocal(worktreePath, config);
        return worktreePath;
      } catch (reuseError) {
        console.error(`   ❌ Failed to reuse branch:`, reuseError);
        throw reuseError;
      }
    }
    throw error;
  }
}

/**
 * Get the worktree path for a ticket
 */
export function getWorktreePath(ticketId: string, config: RalphLocalConfig): string {
  const safeName = safeTicketId(ticketId);
  return join(config.worktreeBase, safeName);
}

/**
 * Get the branch name for a ticket
 */
export function getBranchName(ticketId: string): string {
  const safeName = safeTicketId(ticketId);
  return `ralph/${safeName}`;
}

/**
 * Cleanup a worktree - prefers recycling to preserve node_modules
 */
export function cleanupWorktree(ticketId: string, config: RalphLocalConfig): void {
  const worktreePath = getWorktreePath(ticketId, config);

  console.log(`   🧹 Cleaning up worktree for ${ticketId}`);

  // Try to recycle the worktree first (preserves node_modules for faster reuse)
  if (existsSync(worktreePath) && existsSync(join(worktreePath, "node_modules"))) {
    const recycled = recycleWorktree(ticketId, worktreePath, config);
    if (recycled) {
      return; // Successfully recycled, no further cleanup needed
    }
  }

  // Standard cleanup path
  removeWorktreeDirectory(worktreePath, config);
}

/**
 * Internal helper to remove a worktree directory
 */
function removeWorktreeDirectory(worktreePath: string, config: RalphLocalConfig): void {
  try {
    // Remove the worktree first
    if (existsSync(worktreePath)) {
      execSync(`git worktree remove "${worktreePath}" --force`, {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 60000,
        stdio: "pipe",
      });
      console.log(`   ✅ Worktree removed`);
    }

    // Note: Keep the branch if there's an open PR
    // For now, just remove the worktree, not the branch
  } catch (error) {
    console.log(`   ⚠️ Worktree cleanup warning:`, error);

    // Try force-removing the directory
    if (existsSync(worktreePath)) {
      try {
        rmSync(worktreePath, { recursive: true, force: true });
        console.log(`   ✅ Force-removed worktree directory`);

        // Prune worktrees
        execSync("git worktree prune", {
          cwd: config.workDir,
          encoding: "utf-8",
          timeout: 30000,
          stdio: "pipe",
          shell: true,
    });
      } catch (rmError) {
        console.error(`   ❌ Failed to force-remove:`, rmError);
      }
    }
  }
}

/**
 * Sync a worktree with main branch using full git sync sequence:
 * 1. git pull (fetch + merge current tracking branch)
 * 2. git push (push any local commits)
 * 3. git fetch origin main
 * 4. git merge origin/main -m "merge with main"
 * 5. git push (push merge commit)
 *
 * Security Note: This function uses execSync with controlled inputs only (worktree paths
 * from state management). All paths are validated before use in the calling code.
 */
export function syncWorktreeWithMain(
  worktreePath: string,
): { success: boolean; conflict: boolean; message: string; } {
  console.log(`   🔄 Syncing worktree with main...`);

  // First, check if the worktree directory actually exists
  if (!existsSync(worktreePath)) {
    console.log(`   ⚠️ Worktree directory doesn't exist, skipping: ${worktreePath}`);
    return { success: false, conflict: false, message: "Worktree directory does not exist" };
  }

  // Check if it's a valid git directory
  const gitPath = join(worktreePath, ".git");
  if (!existsSync(gitPath)) {
    console.log(`   ⚠️ Not a valid git worktree, skipping: ${worktreePath}`);
    return { success: false, conflict: false, message: "Not a valid git worktree" };
  }

  try {
    // Step 1: git pull (fetch + merge current tracking branch)
    try {
      execSync("git pull --rebase=false", {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: 60000,
        stdio: "pipe",
        shell: true,
    });
    } catch (pullError) {
      // Pull might fail if no upstream is set - that's ok
      const pullMsg = pullError instanceof Error ? pullError.message : String(pullError);
      if (!pullMsg.includes("no tracking information") && !pullMsg.includes("no upstream")) {
        // Check for conflicts
        if (pullMsg.includes("CONFLICT") || pullMsg.includes("Automatic merge failed")) {
          console.log(`   ⚠️ Pull conflict detected`);
          return { success: false, conflict: true, message: "Pull conflict detected" };
        }
      }
    }

    // Step 2: git push (push any local commits) - with error handling if no upstream
    try {
      execSync("git push", {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: 120000,
        stdio: "pipe",
        shell: true,
    });
    } catch (pushError) {
      // Push might fail if no upstream or nothing to push - that's ok
      const pushMsg = pushError instanceof Error ? pushError.message : String(pushError);
      if (!pushMsg.includes("no upstream") && !pushMsg.includes("Everything up-to-date")) {
        console.log(`   ⚠️ Initial push warning: ${pushMsg.slice(0, 100)}`);
      }
    }

    // Step 3: git fetch origin main
    execSync("git fetch origin main", {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
      shell: true,
    });

    // Step 4: git merge origin/main -m "merge with main"
    execSync('git merge origin/main -m "merge with main"', {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
      shell: true,
    });

    // Step 5: git push (push merge commit)
    try {
      execSync("git push", {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: 120000,
        stdio: "pipe",
        shell: true,
    });
    } catch (finalPushError) {
      // Push might fail if nothing to push or no upstream - that's ok
      const finalPushMsg = finalPushError instanceof Error
        ? finalPushError.message
        : String(finalPushError);
      if (
        !finalPushMsg.includes("Everything up-to-date") && !finalPushMsg.includes("no upstream")
      ) {
        console.log(`   ⚠️ Final push warning: ${finalPushMsg.slice(0, 100)}`);
      }
    }

    console.log(`   ✅ Synced with main`);
    return { success: true, conflict: false, message: "Synced successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes("CONFLICT") || errorMsg.includes("Automatic merge failed")) {
      console.log(`   ⚠️ Merge conflict detected`);

      // Check for conflict markers
      try {
        const status = execSync("git status --porcelain", {
          cwd: worktreePath,
          encoding: "utf-8",
          timeout: 30000,
          shell: true,
    });

        if (status.includes("UU ") || status.includes("AA ") || status.includes("DD ")) {
          return { success: false, conflict: true, message: "Merge conflict detected" };
        }
      } catch {
        // Ignore status check errors
      }

      return { success: false, conflict: true, message: errorMsg };
    }

    console.log(`   ❌ Sync failed: ${errorMsg}`);
    return { success: false, conflict: false, message: errorMsg };
  }
}

/**
 * List all worktrees for Ralph
 */
export function listWorktrees(config: RalphLocalConfig): string[] {
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 30000,
      shell: true,
    });

    const worktrees: string[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        const path = line.replace("worktree ", "").trim();
        // Only include worktrees in our base directory
        if (path.startsWith(config.worktreeBase)) {
          worktrees.push(path);
        }
      }
    }

    return worktrees;
  } catch (error) {
    console.error("Failed to list worktrees:", error);
    return [];
  }
}

/**
 * Check if a worktree exists and is valid
 */
export function worktreeExists(ticketId: string, config: RalphLocalConfig): boolean {
  const worktreePath = getWorktreePath(ticketId, config);

  if (!existsSync(worktreePath)) {
    return false;
  }

  // Check if it's a valid git directory
  const gitDir = join(worktreePath, ".git");
  return existsSync(gitDir);
}

/**
 * Get the current branch of a worktree
 */
export function getWorktreeBranch(worktreePath: string): string | null {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 10000,
      shell: true,
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

/**
 * Check if worktree has uncommitted changes
 */
export function hasUncommittedChanges(worktreePath: string): boolean {
  try {
    const status = execSync("git status --porcelain", {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 30000,
      shell: true,
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Push changes from a worktree
 */
export function pushWorktree(worktreePath: string): boolean {
  try {
    const branch = getWorktreeBranch(worktreePath);
    if (!branch) {
      console.error("Could not determine branch");
      return false;
    }

    // Validate branch name format (must be ralph/digits)
    if (!/^ralph\/\d+$/.test(branch)) {
      console.error(`Invalid branch name format: ${branch}`);
      return false;
    }

    execSync(`git push -u origin ${branch}`, {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 120000,
      stdio: "pipe",
    });

    console.log(`   ✅ Pushed branch ${branch}`);
    return true;
  } catch (error) {
    console.error("Push failed:", error);
    return false;
  }
}

/**
 * Cleanup all stale worktrees (no activity for a long time)
 */
export function cleanupStaleWorktrees(config: RalphLocalConfig, maxAgeMs: number): number {
  let cleanedCount = 0;
  const worktrees = listWorktrees(config);
  const now = Date.now();

  for (const worktreePath of worktrees) {
    try {
      const stat = statSync(worktreePath);
      const ageMs = now - stat.mtimeMs;

      if (ageMs > maxAgeMs) {
        // Extract ticket ID from path
        const ticketNum = worktreePath.split("/").pop() || "";
        // Validate it's just digits
        if (/^\d+$/.test(ticketNum)) {
          console.log(
            `   🗑️ Cleaning stale worktree: #${ticketNum} (age: ${
              Math.round(ageMs / 1000 / 60)
            }min)`,
          );
          cleanupWorktree(`#${ticketNum}`, config);
          cleanedCount++;
        }
      }
    } catch {
      // Ignore stat errors
    }
  }

  return cleanedCount;
}
