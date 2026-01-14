#!/usr/bin/env tsx
/**
 * Ralph Process
 * Main entry point for the Jules workforce automation
 *
 * Usage:
 *   yarn jules:process          # Run single iteration
 *   yarn jules:process --watch  # Run continuously
 *
 * @author Ralph Wiggum ("Me fail English? That's unpossible!")
 */

import { execSync } from "child_process";
import { improveFromResults, isInCooldown } from "./improver";
import { runIteration } from "./iteration";
import { parseRegistry, updateRegistry } from "./registry";
import { analyzeThroughput, validateIteration } from "./validator";

const REGISTRY_PATH = "content/ralph-loop.local.md";
const ITERATION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Main Process
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch") || args.includes("-w");
  const dryRun = args.includes("--dry-run") || args.includes("-n");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("📋 RALPH JULES:PROCESS - Jules Workforce Automation");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Mode: ${watchMode ? "Continuous (--watch)" : "Single iteration"}`);
  console.log(`   Dry Run: ${dryRun}`);
  console.log("");

  if (watchMode) {
    await runContinuousLoop(dryRun);
  } else {
    await runSingleIteration(dryRun);
  }
}

// ============================================================================
// Single Iteration
// ============================================================================

async function runSingleIteration(dryRun: boolean): Promise<void> {
  // Check cooldown
  if (isInCooldown()) {
    console.log("⏸️ In cooldown period, skipping iteration");
    return;
  }

  try {
    // 1. Parse current state
    console.log("\n📊 Loading registry...");
    const registry = await parseRegistry(REGISTRY_PATH);
    console.log(`   Iteration: ${registry.iteration}`);
    console.log(`   Active tasks: ${registry.activeTasks.length}`);
    console.log(
      `   Daily sessions: ${registry.daily_sessions_used}/${registry.daily_session_limit}`,
    );

    // Check daily limit
    if (registry.daily_sessions_used >= registry.daily_session_limit) {
      console.log("\n⚠️ Daily session limit reached!");
      outputIdleStatus(registry);
      return;
    }

    // 2. Run iteration
    console.log("\n🚀 Running iteration...");
    const result = await runIteration(registry);

    // 3. Validate results
    console.log("\n📋 Validating results...");
    const validation = await validateIteration(result);

    if (validation.success) {
      console.log("   ✅ Validation PASSED");
    } else {
      console.log("   ⚠️ Validation issues:");
      for (const issue of validation.issues) {
        console.log(`      - ${issue}`);
      }
    }

    // 4. Self-improve
    console.log("\n🔧 Running self-improvement...");
    const improvements = await improveFromResults(result, validation);

    if (improvements.length > 0) {
      console.log("   Improvements applied:");
      for (const imp of improvements) {
        console.log(`      - ${imp}`);
      }
    } else {
      console.log("   No improvements needed");
    }

    // 5. Update registry (unless dry run)
    if (!dryRun) {
      console.log("\n💾 Updating registry...");
      await updateRegistry(REGISTRY_PATH, {
        iteration: registry.iteration + 1,
        daily_sessions_used: registry.daily_sessions_used + result.sessionsCreated,
        activeTasks: result.updatedTasks,
      });

      // 6. Commit if meaningful work done
      if (result.meaningfulWork) {
        console.log("\n📝 Committing progress...");
        await commitProgress(registry.iteration + 1, result.summary);
      }
    } else {
      console.log("\n🔍 Dry run - skipping registry update and commit");
    }

    // 7. Output summary
    outputIterationSummary(result, validation);

    // 8. Analyze throughput
    const throughput = analyzeThroughput(result);
    console.log("\n📈 Throughput Analysis:");
    console.log(`   Sessions/hour: ${throughput.sessionsPerHour.toFixed(1)}`);
    console.log(`   PRs/hour: ${throughput.prsPerHour.toFixed(1)}`);
    console.log(`   Estimated daily: ${throughput.estimatedDailyThroughput.toFixed(0)} sessions`);
    if (throughput.bottleneck !== "none") {
      console.log(`   Bottleneck: ${throughput.bottleneck}`);
    }
  } catch (error) {
    console.error("\n❌ Iteration failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// Continuous Loop
// ============================================================================

async function runContinuousLoop(dryRun: boolean): Promise<void> {
  console.log("\n🔄 Starting continuous loop...");
  console.log(`   Interval: ${ITERATION_INTERVAL_MS / 1000 / 60} minutes`);
  console.log("   Press Ctrl+C to stop\n");

  let iterationCount = 0;

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n👋 Shutting down gracefully...");
    console.log(`   Completed ${iterationCount} iterations`);
    process.exit(0);
  });

  while (true) {
    iterationCount++;
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📋 CONTINUOUS ITERATION #${iterationCount}`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log(`${"═".repeat(60)}`);

    try {
      await runSingleIteration(dryRun);
    } catch (error) {
      console.error(`\n❌ Iteration #${iterationCount} failed:`, error);
      console.log("   Continuing to next iteration...\n");
    }

    console.log(
      `\n⏰ Waiting ${ITERATION_INTERVAL_MS / 1000 / 60} minutes until next iteration...`,
    );
    await sleep(ITERATION_INTERVAL_MS);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function commitProgress(iteration: number, summary: string): Promise<void> {
  try {
    // Add and commit
    execSync(`git add ${REGISTRY_PATH}`, { encoding: "utf-8" });

    const commitMessage = `chore(ralph): iteration ${iteration} - ${summary}

Co-Authored-By: Ralph Wiggum <ralph@jules.google.com>`;

    execSync(`git commit -m "${escapeForShell(commitMessage)}"`, {
      encoding: "utf-8",
    });

    // Push
    execSync("git push", { encoding: "utf-8" });
    console.log("   ✅ Progress committed and pushed");
  } catch (error) {
    console.log("   ⚠️ Commit failed (may be no changes):", error);
  }
}

function outputIterationSummary(
  result: ReturnType<typeof runIteration> extends Promise<infer T> ? T : never,
  validation: ReturnType<typeof validateIteration> extends Promise<infer T> ? T : never,
): void {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📊 ITERATION SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");

  console.log("\n🎯 Actions Taken:");
  if (result.plansApproved.length > 0) {
    console.log(`   ✅ Approved ${result.plansApproved.length} plans`);
  }
  if (result.sessionsCreated > 0) {
    console.log(`   🚀 Created ${result.sessionsCreated} new sessions`);
  }
  if (result.prsCreated.length > 0) {
    console.log(`   📝 Created ${result.prsCreated.length} PRs`);
  }
  if (result.prsMerged.length > 0) {
    console.log(`   🔀 Merged ${result.prsMerged.length} PRs`);
  }
  if (result.messagesSent.length > 0) {
    console.log(`   💬 Sent ${result.messagesSent.length} feedback responses`);
  }
  if (result.errors.length > 0) {
    console.log(`   ❌ ${result.errors.length} errors occurred`);
  }

  if (!result.meaningfulWork) {
    console.log("   ℹ️ No significant actions taken this iteration");
  }

  console.log("\n📈 Metrics:");
  console.log(`   Approval rate: ${(validation.metrics.approvalRate * 100).toFixed(0)}%`);
  console.log(`   PR creation rate: ${(validation.metrics.prCreationRate * 100).toFixed(0)}%`);
  console.log(`   CI pass rate: ${(validation.metrics.ciPassRate * 100).toFixed(0)}%`);
  console.log(`   Merge rate: ${(validation.metrics.mergeRate * 100).toFixed(0)}%`);
  console.log(
    `   Pipeline utilization: ${(validation.metrics.pipelineUtilization * 100).toFixed(0)}%`,
  );
  console.log(`   Backlog size: ${validation.metrics.backlogSize}`);

  console.log("\n═══════════════════════════════════════════════════════════");
}

function outputIdleStatus(registry: Awaited<ReturnType<typeof parseRegistry>>): void {
  console.log("\n💤 WORKFORCE IDLE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Active tasks: ${registry.activeTasks.length}`);
  console.log(`   Daily sessions: ${registry.daily_sessions_used}/${registry.daily_session_limit}`);
  console.log("\n   Reason: Daily session limit reached");
  console.log("   Next: Wait for daily reset or manual intervention");
  console.log("═══════════════════════════════════════════════════════════");
}

function escapeForShell(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
