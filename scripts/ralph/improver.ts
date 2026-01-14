/**
 * Ralph Self-Improver
 * Automatically adjusts configuration based on results
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import type {
  ConfigUpdate,
  ImprovementRule,
  IterationResult,
  KnownIssue,
  RalphRuntimeConfig,
  ValidationResult,
} from "./types";
import { type ErrorPattern, findRecurringErrors } from "./validator";

const REGISTRY_PATH = "content/ralph-loop.local.md";
const KNOWN_ISSUES_PATH = ".claude/ralph-known-issues.json";
const ERROR_HISTORY_PATH = ".claude/ralph-error-history.json";

// ============================================================================
// Main Improvement Function
// ============================================================================

export async function improveFromResults(
  result: IterationResult,
  validation: ValidationResult,
): Promise<string[]> {
  const improvements: string[] = [];

  // Apply improvement rules
  for (const rule of IMPROVEMENT_RULES) {
    if (rule.condition(result, validation)) {
      try {
        const description = await rule.action(result, validation);
        improvements.push(description);
      } catch (error) {
        console.error(`Improvement rule failed: ${error}`);
      }
    }
  }

  // Track error patterns
  const errorImprovements = await trackErrorPatterns(result.errors);
  improvements.push(...errorImprovements);

  // Log improvements if any
  if (improvements.length > 0) {
    await appendToImprovementLog(improvements);
  }

  return improvements;
}

// ============================================================================
// Improvement Rules
// ============================================================================

const IMPROVEMENT_RULES: ImprovementRule[] = [
  // Rule 1: Increase backlog clearing rate if backlog is growing
  {
    condition: (_result, validation) =>
      validation.issues.some((i) => i.includes("Backlog growing")),
    action: async (_result, _validation) => {
      const currentRate = 5;
      const newRate = Math.min(currentRate + 2, 10);
      await updateConfig({ backlog_clear_rate: newRate });
      return `Increased backlog clearing rate from ${currentRate} to ${newRate} per iteration`;
    },
  },

  // Rule 2: Enable aggressive queue filling if underutilized
  {
    condition: (_result, validation) => validation.issues.some((i) => i.includes("underutilized")),
    action: async () => {
      await updateConfig({ aggressive_queue: true });
      return "Enabled aggressive queue filling mode";
    },
  },

  // Rule 3: Enable pre-PR TypeScript check if CI pass rate is low
  {
    condition: (_result, validation) => validation.metrics.ciPassRate < 0.7,
    action: async () => {
      await updateConfig({ pre_pr_tsc_check: true });
      return "Enabled pre-PR TypeScript validation to improve CI pass rate";
    },
  },

  // Rule 4: Capture successful patterns if merge rate is high
  {
    condition: (_result, validation) => validation.metrics.mergeRate > 0.9,
    action: async (result) => {
      await captureSuccessPatterns(result);
      return "Captured successful patterns for future reference";
    },
  },

  // Rule 5: Slow down if too many errors
  {
    condition: (result) => result.errors.length > 5,
    action: async () => {
      // Add a cooldown period
      const config = loadConfig();
      if (!config.cooldown_until) {
        const cooldownMinutes = 10;
        const cooldownUntil = new Date(
          Date.now() + cooldownMinutes * 60 * 1000,
        ).toISOString();
        await updateConfig({ cooldown_until: cooldownUntil } as ConfigUpdate);
        return `Too many errors - adding ${cooldownMinutes} min cooldown`;
      }
      return "Cooldown already active";
    },
  },

  // Rule 6: Focus on PR lifecycle if many PRs pending
  {
    condition: (result) => {
      const prsPending = result.updatedTasks.filter(
        (t) =>
          t.status === "PR_CREATED" ||
          t.status === "REVIEW_REQUESTED" ||
          t.status === "REVIEW_STARTED",
      ).length;
      return prsPending > 10;
    },
    action: async () => {
      await updateConfig({ pr_lifecycle_priority: true } as ConfigUpdate);
      return "Prioritizing PR lifecycle - too many PRs pending review";
    },
  },
];

// ============================================================================
// Configuration Updates
// ============================================================================

// Note: RalphRuntimeConfig is imported from ./types

function loadConfig(): RalphRuntimeConfig {
  const configPath = ".claude/ralph-runtime-config.json";
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

async function updateConfig(updates: ConfigUpdate): Promise<void> {
  const configPath = ".claude/ralph-runtime-config.json";
  const config = loadConfig();

  // Merge updates
  const newConfig = { ...config, ...updates };

  // Ensure .claude directory exists
  const dir = ".claude";
  if (!existsSync(dir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
}

// ============================================================================
// Error Pattern Tracking
// ============================================================================

async function trackErrorPatterns(errors: string[]): Promise<string[]> {
  const improvements: string[] = [];

  // Load existing patterns
  let existingPatterns: ErrorPattern[] = [];
  if (existsSync(ERROR_HISTORY_PATH)) {
    try {
      existingPatterns = JSON.parse(readFileSync(ERROR_HISTORY_PATH, "utf-8"));
    } catch {
      existingPatterns = [];
    }
  }

  // Find recurring patterns
  const recurringPatterns = findRecurringErrors(errors, existingPatterns);

  // Track new known issues
  for (const pattern of recurringPatterns) {
    if (pattern.occurrences >= 3) {
      await addKnownIssue({
        pattern: pattern.pattern,
        firstSeen: pattern.firstSeen,
        occurrences: pattern.occurrences,
      });
      improvements.push(
        `Added known issue pattern: "${pattern.pattern}" (seen ${pattern.occurrences} times)`,
      );
    }
  }

  // Save updated patterns
  const allPatterns = [...existingPatterns];
  for (const newPattern of recurringPatterns) {
    const existingIndex = allPatterns.findIndex(
      (p) => p.pattern === newPattern.pattern,
    );
    if (existingIndex >= 0) {
      allPatterns[existingIndex] = newPattern;
    } else {
      allPatterns.push(newPattern);
    }
  }

  // Ensure .claude directory exists
  const dir = ".claude";
  if (!existsSync(dir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(ERROR_HISTORY_PATH, JSON.stringify(allPatterns, null, 2));

  return improvements;
}

async function addKnownIssue(issue: KnownIssue): Promise<void> {
  let knownIssues: KnownIssue[] = [];

  if (existsSync(KNOWN_ISSUES_PATH)) {
    try {
      knownIssues = JSON.parse(readFileSync(KNOWN_ISSUES_PATH, "utf-8"));
    } catch {
      knownIssues = [];
    }
  }

  // Check if already exists
  const existing = knownIssues.find((i) => i.pattern === issue.pattern);
  if (existing) {
    existing.occurrences = issue.occurrences;
    return;
  }

  knownIssues.push(issue);

  // Ensure .claude directory exists
  const dir = ".claude";
  if (!existsSync(dir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(KNOWN_ISSUES_PATH, JSON.stringify(knownIssues, null, 2));
}

// ============================================================================
// Success Pattern Capture
// ============================================================================

interface SuccessPattern {
  issueType: string;
  avgTimeToMerge: number;
  commonCharacteristics: string[];
  capturedAt: string;
}

async function captureSuccessPatterns(result: IterationResult): Promise<void> {
  const successPath = ".claude/ralph-success-patterns.json";

  let patterns: SuccessPattern[] = [];
  if (existsSync(successPath)) {
    try {
      patterns = JSON.parse(readFileSync(successPath, "utf-8"));
    } catch {
      patterns = [];
    }
  }

  // Analyze successful merges
  const mergedTasks = result.updatedTasks.filter((t) =>
    result.prsMerged.includes(t.prNumber || "")
  );

  if (mergedTasks.length === 0) return;

  // Calculate characteristics
  const characteristics: string[] = [];

  // Check for common patterns
  const hasTests = mergedTasks.some((t) => t.issue.toLowerCase().includes("test"));
  const isBugFix = mergedTasks.some((t) => t.issue.toLowerCase().includes("bug"));
  const isFeature = mergedTasks.some((t) => t.issue.toLowerCase().includes("feat"));

  if (hasTests) characteristics.push("includes_tests");
  if (isBugFix) characteristics.push("bug_fix");
  if (isFeature) characteristics.push("feature");

  // Calculate avg time to merge (rough estimate)
  const avgTimeHours = (result.endTime.getTime() - result.startTime.getTime()) / (1000 * 60 * 60);

  const newPattern: SuccessPattern = {
    issueType: isFeature ? "feature" : isBugFix ? "bug" : "other",
    avgTimeToMerge: avgTimeHours,
    commonCharacteristics: characteristics,
    capturedAt: new Date().toISOString(),
  };

  patterns.push(newPattern);

  // Keep only last 50 patterns
  if (patterns.length > 50) {
    patterns = patterns.slice(-50);
  }

  // Ensure .claude directory exists
  const dir = ".claude";
  if (!existsSync(dir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(successPath, JSON.stringify(patterns, null, 2));
}

// ============================================================================
// Improvement Log
// ============================================================================

async function appendToImprovementLog(improvements: string[]): Promise<void> {
  try {
    const content = readFileSync(REGISTRY_PATH, "utf-8");

    // Find the Iteration Improvement Log table
    const logMatch = content.match(
      /## Iteration Improvement Log[\s\S]*?\| Iteration \| Change Made/,
    );

    if (!logMatch) {
      console.log("Could not find improvement log section");
      return;
    }

    // Get current iteration from frontmatter
    const iterationMatch = content.match(/iteration: (\d+)/);
    const iteration = iterationMatch ? iterationMatch[1] : "?";

    // Format improvements for markdown table
    const entry = `| ${iteration} | ${improvements.join("; ")} | Auto-improvement |`;

    // Find where to insert (after the header rows)
    const insertPoint = content.indexOf(
      "| Iteration | Change Made",
      content.indexOf("## Iteration Improvement Log"),
    );

    if (insertPoint === -1) {
      console.log("Could not find insertion point in improvement log");
      return;
    }

    // Find the end of the header row (after the separator line)
    const headerEnd = content.indexOf("\n|", insertPoint + 1);
    const separatorEnd = content.indexOf("\n|", headerEnd + 1);

    if (separatorEnd === -1) {
      console.log("Could not find separator in improvement log table");
      return;
    }

    // Insert the new entry after the separator
    const newContent = content.slice(0, separatorEnd + 1) +
      "\n" +
      entry +
      content.slice(separatorEnd + 1);

    writeFileSync(REGISTRY_PATH, newContent);
    console.log("Improvement log updated successfully");
  } catch (error) {
    console.error(`Failed to append to improvement log: ${error}`);
  }
}

// ============================================================================
// Export Runtime Config
// ============================================================================

export function getRuntimeConfig(): RalphRuntimeConfig {
  return loadConfig();
}

export function isInCooldown(): boolean {
  const config = loadConfig();
  if (!config.cooldown_until) return false;

  return new Date(config.cooldown_until) > new Date();
}
