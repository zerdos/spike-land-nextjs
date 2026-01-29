/**
 * Ralph Local Worktree Pool Manager
 * Pre-warms worktrees with dependencies installed for instant developer agent startup
 *
 * Pool Structure:
 *   ../ralph-worktrees/
 *   ├── .pool/                    # Pool directory
 *   │   ├── warm-1/               # Pre-warmed worktree 1
 *   │   ├── warm-2/               # Pre-warmed worktree 2
 *   │   └── ...
 *   ├── .recycle/                 # Worktrees waiting to be recycled
 *   │   ├── from-520/             # Recycled from ticket 520
 *   │   └── ...
 *   ├── 520/                      # Active ticket worktree
 *   └── 521/                      # Active ticket worktree
 *
 * Security Note: This module uses execSync with controlled inputs only.
 * Pool indices are integers, ticket IDs are validated before use.
 * This follows the same patterns as worktree-manager.ts which was reviewed.
 */

import { exec, execSync, spawn } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "fs";
import { basename, join } from "path";
import { promisify } from "util";
import type { RalphLocalConfig } from "./types";

const execAsync = promisify(exec);

// Track background replenishment state
let isReplenishing = false;
let replenishmentPromise: Promise<void> | null = null;

/**
 * Validate pool index (must be a positive integer)
 */
function validatePoolIndex(index: number): boolean {
  return Number.isInteger(index) && index > 0;
}

/**
 * Get the pool directory path
 */
function getPoolDir(config: RalphLocalConfig): string {
  return config.worktreePoolDir;
}

/**
 * Get the recycle directory path
 */
function getRecycleDir(config: RalphLocalConfig): string {
  return join(config.worktreeBase, ".recycle");
}

/**
 * Get the path for a warm worktree by index
 */
function getWarmWorktreePath(index: number, config: RalphLocalConfig): string {
  if (!validatePoolIndex(index)) {
    throw new Error(`Invalid pool index: ${index}`);
  }
  return join(getPoolDir(config), `warm-${index}`);
}

/**
 * List available warm worktrees in the pool
 */
function listWarmWorktrees(config: RalphLocalConfig): string[] {
  const poolDir = getPoolDir(config);

  if (!existsSync(poolDir)) {
    return [];
  }

  try {
    const entries = readdirSync(poolDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("warm-"))
      .map((entry) => join(poolDir, entry.name))
      .filter((path) => {
        // Verify it's a valid git worktree
        const gitDir = join(path, ".git");
        return existsSync(gitDir);
      });
  } catch {
    return [];
  }
}

/**
 * Check if a warm worktree is valid and ready to use
 */
function isWarmWorktreeValid(worktreePath: string): boolean {
  try {
    // Check .git exists
    if (!existsSync(join(worktreePath, ".git"))) {
      return false;
    }

    // Check node_modules exists (dependencies installed)
    if (!existsSync(join(worktreePath, "node_modules"))) {
      return false;
    }

    // Verify git status is clean
    const status = execSync("git status --porcelain", {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 10000,
    }).trim();

    // Allow empty status (clean) or only untracked files
    if (status && status.split("\n").some((line) => !line.startsWith("??"))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * List recyclable worktrees (worktrees that can be reset and reused)
 */
function listRecyclableWorktrees(config: RalphLocalConfig): string[] {
  const recycleDir = getRecycleDir(config);

  if (!existsSync(recycleDir)) {
    return [];
  }

  try {
    const entries = readdirSync(recycleDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("from-"))
      .map((entry) => join(recycleDir, entry.name))
      .filter((path) => {
        // Verify it has node_modules (the valuable part)
        return existsSync(join(path, "node_modules"));
      });
  } catch {
    return [];
  }
}

/**
 * Move a completed worktree to recycle bin for later reuse
 * This preserves node_modules which is expensive to recreate
 */
export function recycleWorktree(
  ticketId: string,
  worktreePath: string,
  config: RalphLocalConfig,
): boolean {
  const recycleDir = getRecycleDir(config);
  const ticketNum = ticketId.replace("#", "");
  const recyclePath = join(recycleDir, `from-${ticketNum}`);

  try {
    // Ensure recycle directory exists
    if (!existsSync(recycleDir)) {
      mkdirSync(recycleDir, { recursive: true });
    }

    // Clean up if a recycle with this name exists
    if (existsSync(recyclePath)) {
      rmSync(recyclePath, { recursive: true, force: true });
    }

    // Only recycle if it has node_modules
    if (!existsSync(join(worktreePath, "node_modules"))) {
      console.log(`   ⚠️ No node_modules to recycle for ${ticketId}`);
      return false;
    }

    // First, remove from git worktree list but keep the directory
    try {
      execSync(`git worktree remove "${worktreePath}" --force`, {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
      });
    } catch {
      // Worktree might already be pruned, that's ok
    }

    // Move the directory to recycle
    if (existsSync(worktreePath)) {
      renameSync(worktreePath, recyclePath);
      console.log(`   ♻️ Recycled worktree ${ticketId} for later reuse`);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`   ⚠️ Failed to recycle worktree: ${error}`);
    return false;
  }
}

/**
 * Recycle a worktree into a warm pool slot (async - non-blocking)
 * This resets the worktree to main and runs yarn install
 */
async function recycleIntoWarmWorktreeAsync(
  recyclePath: string,
  index: number,
  config: RalphLocalConfig,
): Promise<boolean> {
  const poolDir = getPoolDir(config);
  const warmPath = getWarmWorktreePath(index, config);
  const branchName = `ralph/pool-${index}`;

  console.log(`   ♻️ Recycling worktree into warm-${index}...`);

  try {
    // Ensure pool directory exists
    if (!existsSync(poolDir)) {
      mkdirSync(poolDir, { recursive: true });
    }

    // Clean up existing warm path if it exists
    if (existsSync(warmPath)) {
      rmSync(warmPath, { recursive: true, force: true });
    }

    // Delete the target branch if it exists
    try {
      execSync(`git branch -D ${branchName}`, {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
      });
    } catch {
      // Branch doesn't exist, fine
    }

    // Move recycled worktree to warm location
    renameSync(recyclePath, warmPath);

    // Remove any .git file/directory (it's from the old worktree)
    const gitPath = join(warmPath, ".git");
    if (existsSync(gitPath)) {
      rmSync(gitPath, { recursive: true, force: true });
    }

    // Fetch latest main
    await execAsync("git fetch origin main", {
      cwd: config.workDir,
      timeout: 60000,
    });

    // Create a fresh worktree at the existing path
    await execAsync(`git worktree add -b ${branchName} "${warmPath}" origin/main`, {
      cwd: config.workDir,
      timeout: 60000,
    });

    // Run yarn install (should be fast since node_modules exists)
    console.log(`   📦 Running yarn install for warm-${index} (recycled)...`);
    await execAsync("yarn install --immutable 2>&1 || yarn install 2>&1", {
      cwd: warmPath,
      timeout: 300000, // 5 minutes
    });

    console.log(`   ✅ Recycled warm worktree ${index} ready`);
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to recycle warm worktree ${index}:`, error);

    // Cleanup on failure
    try {
      if (existsSync(warmPath)) {
        rmSync(warmPath, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

/**
 * Create a single warm worktree at the specified index
 * Returns true if successful, false otherwise
 */
function createWarmWorktree(index: number, config: RalphLocalConfig): boolean {
  if (!validatePoolIndex(index)) {
    console.log(`   ❌ Invalid pool index: ${index}`);
    return false;
  }

  const poolDir = getPoolDir(config);
  const worktreePath = getWarmWorktreePath(index, config);
  const branchName = `ralph/pool-${index}`;

  console.log(`   🔥 Creating warm worktree ${index} at ${worktreePath}`);

  // Ensure pool directory exists
  if (!existsSync(poolDir)) {
    mkdirSync(poolDir, { recursive: true });
  }

  // Clean up if exists
  if (existsSync(worktreePath)) {
    try {
      execSync(`git worktree remove "${worktreePath}" --force`, {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 60000,
        stdio: "pipe",
      });
    } catch {
      // Try force removing the directory
      rmSync(worktreePath, { recursive: true, force: true });
      execSync("git worktree prune", {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
      });
    }
  }

  // Delete branch if it exists
  try {
    execSync(`git branch -D ${branchName}`, {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 30000,
      stdio: "pipe",
    });
  } catch {
    // Branch doesn't exist, that's fine
  }

  try {
    // Fetch latest main
    execSync("git fetch origin main", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
    });

    // Create the worktree with a pool branch
    execSync(`git worktree add -b ${branchName} "${worktreePath}" origin/main`, {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 60000,
      stdio: "pipe",
    });

    // Install dependencies
    console.log(`   📦 Installing dependencies for warm worktree ${index}...`);
    execSync("yarn install --immutable", {
      cwd: worktreePath,
      encoding: "utf-8",
      timeout: 600000, // 10 minutes for yarn install
      stdio: "pipe",
    });

    console.log(`   ✅ Warm worktree ${index} ready`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create warm worktree ${index}:`, error);

    // Cleanup on failure
    try {
      if (existsSync(worktreePath)) {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: config.workDir,
          encoding: "utf-8",
          timeout: 60000,
          stdio: "pipe",
        });
      }
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }
}

/**
 * Initialize the worktree pool
 * Creates warm worktrees up to the configured pool size
 */
export function initializePool(config: RalphLocalConfig): void {
  console.log(`\n🏊 Initializing worktree pool (size: ${config.worktreePoolSize})`);

  const poolDir = getPoolDir(config);

  // Ensure pool directory exists
  if (!existsSync(poolDir)) {
    mkdirSync(poolDir, { recursive: true });
  }

  // Check current pool status
  const currentWarm = listWarmWorktrees(config);
  const validWarm = currentWarm.filter(isWarmWorktreeValid);

  console.log(
    `   Current pool: ${validWarm.length}/${config.worktreePoolSize} valid warm worktrees`,
  );

  // Create missing warm worktrees
  const needed = config.worktreePoolSize - validWarm.length;
  if (needed <= 0) {
    console.log("   Pool is fully stocked");
    return;
  }

  console.log(`   Creating ${needed} warm worktrees...`);

  // Find available indices
  const usedIndices = new Set(
    validWarm.map((path) => {
      const name = basename(path);
      const match = name.match(/warm-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }),
  );

  let created = 0;
  let index = 1;
  while (created < needed) {
    if (!usedIndices.has(index)) {
      if (createWarmWorktree(index, config)) {
        created++;
        usedIndices.add(index);
      }
    }
    index++;

    // Safety limit to prevent infinite loop
    if (index > config.worktreePoolSize * 2) {
      break;
    }
  }

  console.log(`   Pool initialization complete: ${created}/${needed} worktrees created`);
}

/**
 * Acquire a warm worktree from the pool for a ticket
 * Returns the new worktree path or null if pool is empty
 */
export function acquireFromPool(ticketId: string, config: RalphLocalConfig): string | null {
  // Validate ticket ID format (# followed by digits)
  if (!/^#\d+$/.test(ticketId)) {
    console.log(`   ⚠️ Invalid ticket ID format: ${ticketId}`);
    return null;
  }

  const ticketNum = ticketId.replace("#", "");
  const availableWarm = listWarmWorktrees(config).filter(isWarmWorktreeValid);

  if (availableWarm.length === 0) {
    return null;
  }

  // Take the first available warm worktree
  const warmPath = availableWarm[0];
  const warmName = basename(warmPath);
  const indexMatch = warmName.match(/warm-(\d+)/);
  if (!indexMatch) {
    return null;
  }

  const poolIndex = parseInt(indexMatch[1], 10);
  const poolBranchName = `ralph/pool-${poolIndex}`;
  const ticketBranchName = `ralph/${ticketNum}`;
  const targetPath = join(config.worktreeBase, ticketNum);

  console.log(`   ⚡ Acquiring warm worktree ${poolIndex} for ${ticketId}`);

  try {
    // Rename the branch from pool name to ticket name
    execSync(`git branch -m ${poolBranchName} ${ticketBranchName}`, {
      cwd: warmPath,
      encoding: "utf-8",
      timeout: 30000,
      stdio: "pipe",
    });

    // Move the worktree directory
    renameSync(warmPath, targetPath);

    // Update git worktree records
    execSync("git worktree prune", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 30000,
      stdio: "pipe",
    });

    // Re-register the worktree at its new location
    // This is done automatically by git when we access it, but we verify it works
    execSync("git status", {
      cwd: targetPath,
      encoding: "utf-8",
      timeout: 10000,
      stdio: "pipe",
    });

    console.log(`   ✅ Acquired worktree for ${ticketId}`);

    // Trigger background replenishment
    setImmediate(() => {
      replenishPool(config);
    });

    return targetPath;
  } catch (error) {
    console.error(`   ❌ Failed to acquire warm worktree:`, error);

    // Try to recover - the warm worktree might be corrupted
    try {
      if (existsSync(warmPath)) {
        rmSync(warmPath, { recursive: true, force: true });
      }
      if (existsSync(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true });
      }
      execSync("git worktree prune", {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
      });
    } catch {
      // Ignore cleanup errors
    }

    return null;
  }
}

/**
 * Get the current pool status
 */
export function getPoolStatus(config: RalphLocalConfig): {
  available: number;
  warming: number;
  poolSize: number;
} {
  const warmWorktrees = listWarmWorktrees(config);
  const valid = warmWorktrees.filter(isWarmWorktreeValid);
  const invalid = warmWorktrees.length - valid.length;

  return {
    available: valid.length,
    warming: invalid, // Invalid ones might be in the process of being created
    poolSize: config.worktreePoolSize,
  };
}

/**
 * Replenish the pool in the background (non-blocking)
 * Creates new warm worktrees to fill up to the configured pool size
 */
export function replenishPool(config: RalphLocalConfig): void {
  const status = getPoolStatus(config);

  if (status.available >= config.worktreePoolSize) {
    return; // Pool is full
  }

  const needed = config.worktreePoolSize - status.available;
  console.log(`   🔄 Replenishing pool: need ${needed} warm worktrees`);

  // Find available indices
  const warmWorktrees = listWarmWorktrees(config);
  const usedIndices = new Set(
    warmWorktrees.map((path) => {
      const name = basename(path);
      const match = name.match(/warm-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }),
  );

  let created = 0;
  let index = 1;
  while (created < needed) {
    if (!usedIndices.has(index)) {
      if (createWarmWorktree(index, config)) {
        created++;
        usedIndices.add(index);
      }
    }
    index++;

    // Safety limit
    if (index > config.worktreePoolSize * 2) {
      break;
    }
  }

  if (created > 0) {
    console.log(`   ✅ Replenished ${created} warm worktrees`);
  }
}

/**
 * Copy .env.local from main repo to worktree
 */
export function copyEnvLocal(worktreePath: string, config: RalphLocalConfig): void {
  const mainEnvPath = join(config.workDir, ".env.local");
  const worktreeEnvPath = join(worktreePath, ".env.local");

  if (existsSync(mainEnvPath)) {
    try {
      copyFileSync(mainEnvPath, worktreeEnvPath);
      console.log(`   📋 Copied .env.local to worktree`);
    } catch (error) {
      console.error(`   ⚠️ Failed to copy .env.local:`, error);
    }
  }
}

/**
 * Clean up the entire pool (for maintenance)
 */
export function cleanupPool(config: RalphLocalConfig): void {
  const poolDir = getPoolDir(config);

  if (!existsSync(poolDir)) {
    return;
  }

  console.log(`   🧹 Cleaning up worktree pool`);

  const warmWorktrees = listWarmWorktrees(config);

  for (const worktreePath of warmWorktrees) {
    try {
      execSync(`git worktree remove "${worktreePath}" --force`, {
        cwd: config.workDir,
        encoding: "utf-8",
        timeout: 60000,
        stdio: "pipe",
      });
      console.log(`   Removed ${basename(worktreePath)}`);
    } catch {
      // Try force removing
      try {
        rmSync(worktreePath, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
  }

  // Prune worktrees
  try {
    execSync("git worktree prune", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 30000,
      stdio: "pipe",
    });
  } catch {
    // Ignore
  }

  // Clean up pool branches
  try {
    const branches = execSync("git branch --list 'ralph/pool-*'", {
      cwd: config.workDir,
      encoding: "utf-8",
      timeout: 30000,
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((b) => b.trim());

    for (const branch of branches) {
      try {
        execSync(`git branch -D ${branch}`, {
          cwd: config.workDir,
          encoding: "utf-8",
          timeout: 30000,
          stdio: "pipe",
        });
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore
  }

  console.log(`   ✅ Pool cleanup complete`);
}
