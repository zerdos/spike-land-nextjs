/**
 * Ralph Local PR Manager
 * Handles PR lifecycle: check review status, merge, and fix
 *
 * Security Note: This module uses execSync for gh CLI operations. All inputs are validated:
 * - PR numbers must be positive integers
 * - Branch names must match the ralph/[digits] pattern
 * - Repository name comes from validated config
 * This is an internal orchestration tool, not exposed to user input.
 */

import { execSync } from "child_process";
import type { PRReviewStatus, RalphLocalConfig } from "./types";

/**
 * Validate PR number (must be positive integer)
 */
function validatePrNumber(prNumber: number): boolean {
  return Number.isInteger(prNumber) && prNumber > 0 && prNumber < 1000000;
}

/**
 * Validate branch name (must be ralph/digits format)
 */
function validateBranch(branch: string): boolean {
  return /^ralph\/\d+$/.test(branch);
}

/**
 * Escape string for shell (basic sanitization)
 */
function escapeForShell(str: string): string {
  // Replace dangerous characters
  return str.replace(/["`$\\]/g, "\\$&");
}

/**
 * Get PR review status using gh CLI
 */
export function getPRStatus(prNumber: number, config: RalphLocalConfig): PRReviewStatus | null {
  if (!validatePrNumber(prNumber)) {
    console.error(`Invalid PR number: ${prNumber}`);
    return null;
  }

  try {
    // Get PR review status - prNumber is validated as integer
    const reviewJson = execSync(
      `gh pr view ${prNumber} --json reviews,statusCheckRollup,state,mergeable --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const prData = JSON.parse(reviewJson);

    // Determine review status
    let reviewStatus: PRReviewStatus["status"] = "PENDING";
    let reviewComments: string[] = [];

    // Check reviews
    if (prData.reviews && prData.reviews.length > 0) {
      // Check for claude-code-review bot approval
      const botReview = prData.reviews.find(
        (r: { author?: { login?: string }; state?: string }) =>
          r.author?.login === "github-actions[bot]" ||
          r.author?.login === "claude-code-review[bot]",
      );

      if (botReview) {
        if (botReview.state === "APPROVED") {
          reviewStatus = "APPROVED";
        } else if (botReview.state === "CHANGES_REQUESTED") {
          reviewStatus = "CHANGES_REQUESTED";
          reviewComments = prData.reviews
            .filter((r: { state?: string }) => r.state === "CHANGES_REQUESTED")
            .map((r: { body?: string }) => r.body || "");
        }
      }
    }

    // Check CI status
    let ciStatus: "passing" | "failing" | "pending" = "pending";
    if (prData.statusCheckRollup) {
      const checks = prData.statusCheckRollup;
      const allPassed = checks.every(
        (c: { state?: string; conclusion?: string }) =>
          c.state === "SUCCESS" || c.conclusion === "SUCCESS",
      );
      const anyFailed = checks.some(
        (c: { state?: string; conclusion?: string }) =>
          c.state === "FAILURE" || c.conclusion === "FAILURE",
      );

      if (allPassed) {
        ciStatus = "passing";
      } else if (anyFailed) {
        ciStatus = "failing";
        reviewStatus = "CI_FAILING";
      }
    }

    return {
      prNumber,
      status: reviewStatus,
      reviewComments,
      ciStatus,
    };
  } catch (error) {
    console.error(`Failed to get PR status for #${prNumber}:`, error);
    return null;
  }
}

/**
 * Get all open PRs created by Ralph
 */
export function listRalphPRs(config: RalphLocalConfig): number[] {
  try {
    const output = execSync(
      `gh pr list --json number,headRefName --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const prs = JSON.parse(output);

    // Filter to only Ralph branches
    return prs
      .filter((pr: { headRefName?: string }) => pr.headRefName?.startsWith("ralph/"))
      .map((pr: { number: number }) => pr.number);
  } catch (error) {
    console.error("Failed to list PRs:", error);
    return [];
  }
}

/**
 * Merge a PR
 */
export function mergePR(prNumber: number, config: RalphLocalConfig): boolean {
  if (!validatePrNumber(prNumber)) {
    console.error(`Invalid PR number: ${prNumber}`);
    return false;
  }

  try {
    execSync(
      `gh pr merge ${prNumber} --squash --delete-branch --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 120000,
        cwd: config.workDir,
        stdio: "pipe",
      },
    );

    console.log(`   ✅ Merged PR #${prNumber}`);
    return true;
  } catch (error) {
    console.error(`Failed to merge PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Create a PR from a branch
 */
export function createPR(
  branch: string,
  title: string,
  body: string,
  config: RalphLocalConfig,
): { prUrl: string; prNumber: number } | null {
  // Validate branch format
  if (!validateBranch(branch)) {
    console.error(`Invalid branch format: ${branch}`);
    return null;
  }

  // Escape title and body for shell
  const safeTitle = escapeForShell(title);
  const safeBody = escapeForShell(body);

  try {
    const output = execSync(
      `gh pr create --head "${branch}" --title "${safeTitle}" --body "${safeBody}" --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 60000,
        cwd: config.workDir,
      },
    );

    // Extract PR URL from output
    const prUrl = output.trim();
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0;

    console.log(`   ✅ Created PR #${prNumber}: ${prUrl}`);
    return { prUrl, prNumber };
  } catch (error) {
    console.error(`Failed to create PR for branch ${branch}:`, error);
    return null;
  }
}

/**
 * Get PR comments (for understanding review feedback)
 */
export function getPRComments(prNumber: number, config: RalphLocalConfig): string[] {
  if (!validatePrNumber(prNumber)) {
    return [];
  }

  try {
    const output = execSync(
      `gh pr view ${prNumber} --json comments --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const data = JSON.parse(output);
    return data.comments?.map((c: { body?: string }) => c.body || "") || [];
  } catch (error) {
    console.error(`Failed to get PR comments for #${prNumber}:`, error);
    return [];
  }
}

/**
 * Add a comment to a PR
 */
export function addPRComment(prNumber: number, comment: string, config: RalphLocalConfig): boolean {
  if (!validatePrNumber(prNumber)) {
    return false;
  }

  // Escape comment for shell
  const safeComment = escapeForShell(comment);

  try {
    execSync(
      `gh pr comment ${prNumber} --body "${safeComment}" --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
        stdio: "pipe",
      },
    );
    return true;
  } catch (error) {
    console.error(`Failed to add comment to PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Update PR branch (rebase/merge main)
 */
export function updatePRBranch(prNumber: number, config: RalphLocalConfig): boolean {
  if (!validatePrNumber(prNumber)) {
    return false;
  }

  try {
    execSync(
      `gh pr merge ${prNumber} --update --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 120000,
        cwd: config.workDir,
        stdio: "pipe",
      },
    );

    console.log(`   ✅ Updated PR #${prNumber} branch`);
    return true;
  } catch (error) {
    console.error(`Failed to update PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Close a PR without merging
 */
export function closePR(prNumber: number, reason: string, config: RalphLocalConfig): boolean {
  if (!validatePrNumber(prNumber)) {
    return false;
  }

  try {
    // Add a comment explaining why
    addPRComment(prNumber, `Closing PR: ${reason}`, config);

    execSync(
      `gh pr close ${prNumber} --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
        stdio: "pipe",
      },
    );

    console.log(`   ✅ Closed PR #${prNumber}`);
    return true;
  } catch (error) {
    console.error(`Failed to close PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Check if claude-code-review workflow has run
 */
export function hasCodeReviewRun(prNumber: number, config: RalphLocalConfig): boolean {
  if (!validatePrNumber(prNumber)) {
    return false;
  }

  try {
    const output = execSync(
      `gh pr view ${prNumber} --json statusCheckRollup --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const data = JSON.parse(output);
    const checks = data.statusCheckRollup || [];

    // Look for claude-code-review check
    return checks.some(
      (c: { name?: string; context?: string }) =>
        c.name?.includes("claude-code-review") ||
        c.context?.includes("claude-code-review"),
    );
  } catch {
    return false;
  }
}

/**
 * Get workflow run URL for debugging
 */
export function getWorkflowRunUrl(prNumber: number, config: RalphLocalConfig): string | null {
  if (!validatePrNumber(prNumber)) {
    return null;
  }

  try {
    const output = execSync(
      `gh pr view ${prNumber} --json statusCheckRollup --repo ${config.repo}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: config.workDir,
      },
    );

    const data = JSON.parse(output);
    const checks = data.statusCheckRollup || [];

    // Find the workflow run
    const workflowCheck = checks.find(
      (c: { name?: string; targetUrl?: string }) =>
        c.name?.includes("test") || c.name?.includes("build") || c.name?.includes("Run"),
    );

    return workflowCheck?.targetUrl || null;
  } catch {
    return null;
  }
}
