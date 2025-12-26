#!/usr/bin/env tsx
/**
 * E2E Cache Manager
 *
 * CLI tool that determines which E2E feature files need to run based on coverage-based dependencies.
 * Uses coverage data from Cucumber/Playwright runs to track feature → source file mappings.
 *
 * Commands:
 *   list-features-to-run  - Returns JSON array of features needing execution
 *   should-skip-all       - Exit 0 if all cached, exit 1 if features needed
 *   get-feature-filter    - Feature file paths for cucumber CLI
 *   update-cache          - Update cache from coverage report
 *   stats                 - Show cache statistics
 */

import { execSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

interface E2ECacheEntry {
  lastPassedCommit: string;
  lastPassedTimestamp: string;
  featureFileHash: string;
  dependencies: string[];
  dependencyHashes: Record<string, string>;
}

interface E2ECache {
  version: number;
  lastFullRun: string;
  entries: Record<string, E2ECacheEntry>;
}

// Global dependencies that invalidate all cache entries when changed
const GLOBAL_DEPENDENCIES = [
  "cucumber.js",
  "e2e/support/world.ts",
  "e2e/support/hooks.ts",
  "package.json",
  "next.config.ts",
];

// Step definition patterns - if these change, related features must re-run
const STEP_DEFINITION_DIR = "e2e/step-definitions";

const PROJECT_ROOT = process.cwd();
const CACHE_DIR = process.env.E2E_CACHE_DIR || path.join(PROJECT_ROOT, ".e2e-cache");
const CACHE_PATH = path.join(CACHE_DIR, "e2e-cache.json");
const COVERAGE_PATH = path.join(PROJECT_ROOT, "e2e", "reports", "coverage", "coverage-final.json");
const DEBUG = process.env.DEBUG === "true";

function log(message: string): void {
  if (DEBUG) {
    console.error(`[E2ECache] ${message}`);
  }
}

function loadCache(): E2ECache | null {
  if (!existsSync(CACHE_PATH)) {
    log("No cache file found");
    return null;
  }
  try {
    const cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    if (cache.version !== 1) {
      log(`Cache version mismatch: ${cache.version} !== 1`);
      return null;
    }
    return cache;
  } catch (e) {
    log(`Failed to parse cache: ${e}`);
    return null;
  }
}

function saveCache(cache: E2ECache): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getCurrentCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      .trim();
  } catch {
    return "unknown";
  }
}

function getFileHash(filePath: string): string {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
    const content = readFileSync(fullPath, "utf-8");
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  } catch {
    return "missing";
  }
}

function getChangedFiles(sinceCommit: string): Set<string> {
  try {
    execSync(`git cat-file -t ${sinceCommit}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const output = execSync(`git diff --name-only ${sinceCommit} HEAD`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const files = new Set(output.trim().split("\n").filter(Boolean));
    log(`Found ${files.size} changed files since ${sinceCommit.slice(0, 8)}`);
    return files;
  } catch {
    log("Failed to get changed files");
    return new Set();
  }
}

function getAllFeatureFiles(): string[] {
  const featureFiles: string[] = [];
  const featuresDir = path.join(PROJECT_ROOT, "e2e", "features");

  function walkDir(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip deprecated folder
          if (entry.name !== "deprecated") {
            walkDir(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(".feature")) {
          const relativePath = path.relative(PROJECT_ROOT, fullPath);
          featureFiles.push(relativePath);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }

  walkDir(featuresDir);
  return featureFiles.sort();
}

function getStepDefinitionFiles(): string[] {
  const stepFiles: string[] = [];
  const stepsDir = path.join(PROJECT_ROOT, STEP_DEFINITION_DIR);

  try {
    const entries = readdirSync(stepsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".steps.ts")) {
        stepFiles.push(path.join(STEP_DEFINITION_DIR, entry.name));
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return stepFiles;
}

function checkGlobalDependencies(changedFiles: Set<string>): boolean {
  for (const dep of GLOBAL_DEPENDENCIES) {
    if (changedFiles.has(dep)) {
      log(`Global dependency changed: ${dep}`);
      return true;
    }
  }
  return false;
}

function checkStepDefinitionsChanged(changedFiles: Set<string>): string[] {
  const changedSteps: string[] = [];
  const stepFiles = getStepDefinitionFiles();

  for (const step of stepFiles) {
    if (changedFiles.has(step)) {
      changedSteps.push(step);
    }
  }

  return changedSteps;
}

interface FeatureNeedsRunResult {
  needsRun: boolean;
  reason: string;
}

function featureNeedsRun(
  featurePath: string,
  entry: E2ECacheEntry | undefined,
  changedFiles: Set<string>,
  changedSteps: string[],
): FeatureNeedsRunResult {
  // No cache entry - must run
  if (!entry) {
    return { needsRun: true, reason: "no-cache-entry" };
  }

  // Feature file itself changed
  const currentFeatureHash = getFileHash(featurePath);
  if (currentFeatureHash !== entry.featureFileHash) {
    return { needsRun: true, reason: "feature-file-hash-changed" };
  }

  if (changedFiles.has(featurePath)) {
    return { needsRun: true, reason: "feature-in-git-diff" };
  }

  // Check if related step definitions changed
  // (For now, if any step definition changed, feature needs to re-run if it has no specific dependency info)
  if (changedSteps.length > 0 && entry.dependencies.length === 0) {
    return { needsRun: true, reason: "step-definitions-changed-no-deps" };
  }

  // Check each dependency
  for (const dep of entry.dependencies) {
    if (changedFiles.has(dep)) {
      return { needsRun: true, reason: `dependency-in-git-diff:${dep}` };
    }

    const currentHash = getFileHash(dep);
    const cachedHash = entry.dependencyHashes[dep];
    if (currentHash !== cachedHash) {
      return { needsRun: true, reason: `dependency-hash-changed:${dep}` };
    }
  }

  return { needsRun: false, reason: "all-dependencies-unchanged" };
}

function listFeaturesToRun(): string[] {
  const cache = loadCache();

  if (!cache) {
    log("No cache available, all features must run");
    return getAllFeatureFiles();
  }

  const changedFiles = getChangedFiles(cache.lastFullRun);

  // Check global dependencies
  if (checkGlobalDependencies(changedFiles)) {
    log("Global dependency changed, all features must run");
    return getAllFeatureFiles();
  }

  const changedSteps = checkStepDefinitionsChanged(changedFiles);
  if (changedSteps.length > 0) {
    log(`Step definitions changed: ${changedSteps.join(", ")}`);
  }

  const allFeatures = getAllFeatureFiles();
  const featuresToRun: string[] = [];

  for (const featurePath of allFeatures) {
    const entry = cache.entries[featurePath];
    const { needsRun, reason } = featureNeedsRun(featurePath, entry, changedFiles, changedSteps);

    if (needsRun) {
      featuresToRun.push(featurePath);
      log(`${featurePath}: ${reason}`);
    }
  }

  return featuresToRun;
}

function updateCacheFromCoverage(): void {
  const currentCommit = getCurrentCommit();

  // Load or create cache
  const cache: E2ECache = loadCache() || {
    version: 1,
    lastFullRun: currentCommit,
    entries: {},
  };

  // Try to load coverage data
  if (!existsSync(COVERAGE_PATH)) {
    console.log("No coverage file found at", COVERAGE_PATH);
    console.log("Run E2E tests with E2E_COVERAGE=true to generate coverage data.");
    return;
  }

  try {
    const coverageData = JSON.parse(readFileSync(COVERAGE_PATH, "utf-8"));
    const coveredFiles = Object.keys(coverageData)
      .map((f) => {
        let p = f;
        if (p.startsWith("file://")) p = p.replace("file://", "");
        if (p.startsWith(PROJECT_ROOT)) p = p.slice(PROJECT_ROOT.length + 1);
        return p;
      })
      .filter(
        (f) =>
          !f.includes("node_modules") &&
          !f.includes(".next") &&
          (f.startsWith("src/") || f.startsWith("apps/")),
      );

    console.log(`Found ${coveredFiles.length} source files in coverage`);

    // Update all feature files with coverage data
    const allFeatures = getAllFeatureFiles();

    for (const featurePath of allFeatures) {
      const dependencyHashes: Record<string, string> = {};
      for (const dep of coveredFiles) {
        dependencyHashes[dep] = getFileHash(dep);
      }

      cache.entries[featurePath] = {
        lastPassedCommit: currentCommit,
        lastPassedTimestamp: new Date().toISOString(),
        featureFileHash: getFileHash(featurePath),
        dependencies: coveredFiles,
        dependencyHashes,
      };
    }

    cache.lastFullRun = currentCommit;
    saveCache(cache);
    console.log(`Updated cache with ${allFeatures.length} features`);
  } catch (e) {
    console.error("Failed to parse coverage:", e);
  }
}

function shouldSkipAll(): boolean {
  const featuresToRun = listFeaturesToRun();
  return featuresToRun.length === 0;
}

function showStats(): void {
  const cache = loadCache();
  const allFeatures = getAllFeatureFiles();

  console.log("=== E2E Cache Statistics ===\n");

  if (!cache) {
    console.log("No cache file found.");
    console.log(`Total feature files: ${allFeatures.length}`);
    return;
  }

  const cachedCount = Object.keys(cache.entries).length;
  const featuresToRun = listFeaturesToRun();

  console.log(`Cache version: ${cache.version}`);
  console.log(`Last full run: ${cache.lastFullRun.slice(0, 8)}`);
  console.log(`Total feature files: ${allFeatures.length}`);
  console.log(`Cached entries: ${cachedCount}`);
  console.log(`Features to run: ${featuresToRun.length}`);
  console.log(`Features skippable: ${allFeatures.length - featuresToRun.length}`);
  console.log(
    `\nCache hit rate: ${
      (((allFeatures.length - featuresToRun.length) / allFeatures.length) * 100).toFixed(1)
    }%`,
  );

  if (featuresToRun.length > 0 && featuresToRun.length <= 10) {
    console.log("\nFeatures that need to run:");
    for (const feature of featuresToRun) {
      console.log(`  - ${feature}`);
    }
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case "list-features-to-run": {
    const features = listFeaturesToRun();
    console.log(JSON.stringify(features));
    break;
  }

  case "should-skip-all": {
    if (shouldSkipAll()) {
      console.log("true");
      process.exit(0);
    } else {
      console.log("false");
      process.exit(1);
    }
    break;
  }

  case "get-feature-filter": {
    const featuresToRun = listFeaturesToRun();
    if (featuresToRun.length === 0) {
      console.log("--skip-all");
    } else {
      console.log(featuresToRun.join(" "));
    }
    break;
  }

  case "update-cache": {
    updateCacheFromCoverage();
    break;
  }

  case "stats": {
    showStats();
    break;
  }

  default: {
    console.error("E2E Cache Manager");
    console.error("");
    console.error("Usage: e2e-cache-manager <command>");
    console.error("");
    console.error("Commands:");
    console.error("  list-features-to-run  Returns JSON array of features needing execution");
    console.error("  should-skip-all       Exit 0 if all cached, exit 1 if features needed");
    console.error("  get-feature-filter    Feature file paths for cucumber CLI");
    console.error("  update-cache          Update cache from coverage report");
    console.error("  stats                 Show cache statistics");
    console.error("");
    console.error("Environment:");
    console.error("  E2E_CACHE_DIR         Cache directory (default: .e2e-cache)");
    console.error("  DEBUG=true            Enable debug logging");
    process.exit(1);
  }
}
