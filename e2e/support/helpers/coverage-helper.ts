import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

interface V8CoverageEntry {
  url: string;
  scriptId: string;
  source?: string;
  functions: V8FunctionCoverage[];
}

interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

interface IstanbulFileCoverage {
  path: string;
  statementMap: Record<string, IstanbulLocation>;
  fnMap: Record<string, IstanbulFnLocation>;
  branchMap: Record<string, IstanbulBranchLocation>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

interface IstanbulLocation {
  start: { line: number; column: number; };
  end: { line: number; column: number; };
}

interface IstanbulFnLocation {
  name: string;
  decl: IstanbulLocation;
  loc: IstanbulLocation;
  line: number;
}

interface IstanbulBranchLocation {
  type: string;
  loc: IstanbulLocation;
  locations: IstanbulLocation[];
  line: number;
}

interface IstanbulCoverageMap {
  [filePath: string]: IstanbulFileCoverage;
}

// Accumulated coverage data across all scenarios
const allCoverageData: V8CoverageEntry[] = [];

// Track whether coverage is enabled
const coverageEnabled = process.env.E2E_COVERAGE === "true";

/**
 * Start JavaScript coverage collection on a page
 */
export async function startCoverage(page: Page): Promise<void> {
  if (!coverageEnabled) return;

  try {
    await page.coverage.startJSCoverage({
      resetOnNavigation: false,
    });
  } catch (error) {
    console.warn("[Coverage] Failed to start JS coverage:", error);
  }
}

/**
 * Stop coverage collection and store the data
 */
export async function stopCoverage(page: Page): Promise<void> {
  if (!coverageEnabled) return;

  try {
    const coverage = await page.coverage.stopJSCoverage();

    // Filter to only include source files from our app (src/ directory)
    const appCoverage = coverage.filter((entry) => {
      const url = entry.url;
      // Include files from localhost or deployed app
      const isAppUrl = url.includes("localhost:3000") ||
        url.includes("spike.land");
      if (!isAppUrl) return false;

      // Only include our source code chunks (contains src_ in the chunk name)
      // These are the actual app source files, not Next.js internals
      const isSourceCode = url.includes("_src_") || // Matches chunks like Developer_spike-land-nextjs_src_
        url.includes("/src/") || // Direct source imports
        url.includes("spike-land-nextjs_src_"); // Alternative chunk naming

      // Exclude framework internals
      const isFrameworkCode = url.includes("node_modules") ||
        url.includes("_next/static/chunks/webpack") ||
        url.includes("_next/static/chunks/polyfills") ||
        url.includes("next_dist_") ||
        url.includes("react-dom") ||
        url.includes("react-server-dom") ||
        url.includes("turbopack%5D") || // [turbopack] HMR client
        url.includes("tailwind-merge") ||
        url.includes("next-devtools") ||
        url.includes("hmr-client");

      // Only include JS files
      const isJsFile = url.endsWith(".js") || url.includes(".js?");

      return isSourceCode && !isFrameworkCode && isJsFile;
    });

    allCoverageData.push(...appCoverage);
  } catch (error) {
    console.warn("[Coverage] Failed to stop JS coverage:", error);
  }
}

/**
 * Convert V8 coverage to Istanbul format (simplified)
 *
 * LIMITATIONS:
 * - Line numbers are approximated (V8 uses byte offsets, not source map positions)
 * - All locations use line 1 with column offsets representing byte positions
 * - Branch coverage is not populated (V8 reports block coverage differently)
 * - This provides statement/function coverage counts but not accurate line-level reporting
 *
 * For accurate line-level coverage, source map integration would be required.
 */
function convertToIstanbul(v8Coverage: V8CoverageEntry[]): IstanbulCoverageMap {
  const istanbulCoverage: IstanbulCoverageMap = {};

  for (const entry of v8Coverage) {
    // Extract file path from URL
    let filePath: string;
    try {
      const url = new URL(entry.url);
      filePath = url.pathname;

      // Skip if no valid path
      if (!filePath || filePath === "/") continue;

      // Normalize the path
      filePath = filePath.replace(/^\//, "");
    } catch {
      continue;
    }

    // Create or merge coverage for this file
    if (!istanbulCoverage[filePath]) {
      istanbulCoverage[filePath] = {
        path: filePath,
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {},
      };
    }

    const fileCov = istanbulCoverage[filePath];
    if (!fileCov) continue; // Should never happen, but satisfies TypeScript
    let stmtIdx = Object.keys(fileCov.statementMap).length;
    let fnIdx = Object.keys(fileCov.fnMap).length;

    // Convert function coverage
    for (const fn of entry.functions) {
      if (fn.ranges.length === 0) continue;

      const range = fn.ranges[0];
      if (!range) continue; // Should never happen after length check, but satisfies TypeScript
      const covered = range.count > 0;

      // Add function
      fileCov.fnMap[fnIdx.toString()] = {
        name: fn.functionName || "(anonymous)",
        decl: {
          start: { line: 1, column: range.startOffset },
          end: { line: 1, column: range.startOffset + 1 },
        },
        loc: {
          start: { line: 1, column: range.startOffset },
          end: { line: 1, column: range.endOffset },
        },
        line: 1,
      };
      fileCov.f[fnIdx.toString()] = covered ? 1 : 0;
      fnIdx++;

      // Add statement for each range
      for (const r of fn.ranges) {
        fileCov.statementMap[stmtIdx.toString()] = {
          start: { line: 1, column: r.startOffset },
          end: { line: 1, column: r.endOffset },
        };
        fileCov.s[stmtIdx.toString()] = r.count;
        stmtIdx++;
      }
    }
  }

  return istanbulCoverage;
}

/**
 * Generate coverage report from collected data
 */
export async function generateCoverageReport(): Promise<void> {
  if (!coverageEnabled) {
    console.log(
      "[Coverage] Coverage not enabled. Set E2E_COVERAGE=true to enable.",
    );
    return;
  }

  if (allCoverageData.length === 0) {
    console.log("[Coverage] No coverage data collected.");
    return;
  }

  console.log(
    `[Coverage] Generating report from ${allCoverageData.length} entries...`,
  );

  const coverageDir = path.join(process.cwd(), "e2e/reports/coverage");

  // Ensure coverage directory exists
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Write raw V8 coverage
  const v8CoveragePath = path.join(coverageDir, "v8-coverage.json");
  fs.writeFileSync(v8CoveragePath, JSON.stringify(allCoverageData, null, 2));
  console.log(`[Coverage] V8 coverage written to: ${v8CoveragePath}`);

  // Convert to Istanbul format
  const istanbulCoverage = convertToIstanbul(allCoverageData);
  const istanbulPath = path.join(coverageDir, "coverage-final.json");
  fs.writeFileSync(istanbulPath, JSON.stringify(istanbulCoverage, null, 2));
  console.log(`[Coverage] Istanbul coverage written to: ${istanbulPath}`);

  // Generate summary (plain text for file)
  const summary = generateSummary(istanbulCoverage);
  const summaryPath = path.join(coverageDir, "coverage-summary.txt");
  fs.writeFileSync(summaryPath, summary);
  console.log(`[Coverage] Summary written to: ${summaryPath}`);

  // Print colorful summary to console
  generateConsoleSummary(istanbulCoverage);
}

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

/**
 * Extract a human-readable name from a bundled chunk path
 */
function extractReadableName(filePath: string): string {
  // Try to extract meaningful path from Next.js chunk names
  // e.g., "Developer_spike-land-nextjs_src_app_pricing_page_tsx_5dc2dbca._.js"
  // -> "src/app/pricing/page.tsx"

  const match = filePath.match(/spike-land-nextjs_(.+?)_[a-f0-9]+\._\.js$/);
  if (match && match[1]) {
    return match[1]
      .replace(/_tsx$/, ".tsx")
      .replace(/_ts$/, ".ts")
      .replace(/_/g, "/");
  }

  // For other chunk patterns, try to extract src path
  const srcMatch = filePath.match(/src_(.+?)(?:_[a-f0-9]+)?\._\.js$/);
  if (srcMatch && srcMatch[1]) {
    return "src/" + srcMatch[1].replace(/_/g, "/");
  }

  // Return last part of path if no pattern matches
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Get color based on coverage percentage
 */
function getCoverageColor(pct: number): string {
  if (pct >= 80) return colors.green;
  if (pct >= 60) return colors.yellow;
  return colors.red;
}

/**
 * Format a percentage with color
 */
function formatPct(pct: number, withColor = true): string {
  const formatted = pct.toFixed(1).padStart(5) + "%";
  if (!withColor) return formatted;
  return getCoverageColor(pct) + formatted + colors.reset;
}

/**
 * Create a progress bar
 */
function createProgressBar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const color = getCoverageColor(pct);
  return color + "█".repeat(filled) + colors.dim + "░".repeat(empty) +
    colors.reset;
}

interface FileCoverageStats {
  path: string;
  readableName: string;
  statements: number;
  coveredStatements: number;
  stmtPct: number;
  functions: number;
  coveredFunctions: number;
  fnPct: number;
}

/**
 * Generate a text summary of coverage
 */
function generateSummary(coverage: IstanbulCoverageMap): string {
  const files = Object.keys(coverage);
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;

  // Collect stats for all files
  const fileStats: FileCoverageStats[] = [];

  for (const filePath of files) {
    const fileCov = coverage[filePath];
    if (!fileCov) continue;

    const fileStatements = Object.keys(fileCov.s).length;
    const fileCoveredStatements = Object.values(fileCov.s).filter((v) => v > 0).length;
    const fileFunctions = Object.keys(fileCov.f).length;
    const fileCoveredFunctions = Object.values(fileCov.f).filter((v) => v > 0).length;

    totalStatements += fileStatements;
    coveredStatements += fileCoveredStatements;
    totalFunctions += fileFunctions;
    coveredFunctions += fileCoveredFunctions;

    const stmtPct = fileStatements > 0
      ? (fileCoveredStatements / fileStatements) * 100
      : 0;
    const fnPct = fileFunctions > 0
      ? (fileCoveredFunctions / fileFunctions) * 100
      : 0;

    fileStats.push({
      path: filePath,
      readableName: extractReadableName(filePath),
      statements: fileStatements,
      coveredStatements: fileCoveredStatements,
      stmtPct,
      functions: fileFunctions,
      coveredFunctions: fileCoveredFunctions,
      fnPct,
    });
  }

  // Sort by statement coverage (lowest first) to highlight areas needing work
  fileStats.sort((a, b) => a.stmtPct - b.stmtPct);

  const totalStmtPct = totalStatements > 0
    ? (coveredStatements / totalStatements) * 100
    : 0;
  const totalFnPct = totalFunctions > 0
    ? (coveredFunctions / totalFunctions) * 100
    : 0;

  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(`${colors.bold}TOTALS:${colors.reset}`);
  lines.push(`Files: ${files.length}`);
  lines.push(
    `Statements: ${coveredStatements}/${totalStatements} (${totalStmtPct.toFixed(1)}%)`,
  );
  lines.push(
    `Functions:  ${coveredFunctions}/${totalFunctions} (${totalFnPct.toFixed(1)}%)`,
  );
  lines.push("");

  // Detailed file breakdown (sorted by coverage, lowest first)
  for (const stat of fileStats) {
    lines.push(`${stat.path}`);
    lines.push(
      `  Statements: ${stat.coveredStatements}/${stat.statements} (${stat.stmtPct.toFixed(1)}%)`,
    );
    lines.push(
      `  Functions:  ${stat.coveredFunctions}/${stat.functions} (${stat.fnPct.toFixed(1)}%)`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate a colorful console summary of coverage
 */
function generateConsoleSummary(coverage: IstanbulCoverageMap): void {
  const files = Object.keys(coverage);
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;

  // Collect stats for all files
  const fileStats: FileCoverageStats[] = [];

  for (const filePath of files) {
    const fileCov = coverage[filePath];
    if (!fileCov) continue;

    const fileStatements = Object.keys(fileCov.s).length;
    const fileCoveredStatements = Object.values(fileCov.s).filter((v) => v > 0).length;
    const fileFunctions = Object.keys(fileCov.f).length;
    const fileCoveredFunctions = Object.values(fileCov.f).filter((v) => v > 0).length;

    totalStatements += fileStatements;
    coveredStatements += fileCoveredStatements;
    totalFunctions += fileFunctions;
    coveredFunctions += fileCoveredFunctions;

    const stmtPct = fileStatements > 0
      ? (fileCoveredStatements / fileStatements) * 100
      : 0;
    const fnPct = fileFunctions > 0
      ? (fileCoveredFunctions / fileFunctions) * 100
      : 0;

    fileStats.push({
      path: filePath,
      readableName: extractReadableName(filePath),
      statements: fileStatements,
      coveredStatements: fileCoveredStatements,
      stmtPct,
      functions: fileFunctions,
      coveredFunctions: fileCoveredFunctions,
      fnPct,
    });
  }

  // Sort by statement coverage (lowest first)
  fileStats.sort((a, b) => a.stmtPct - b.stmtPct);

  const totalStmtPct = totalStatements > 0
    ? (coveredStatements / totalStatements) * 100
    : 0;
  const totalFnPct = totalFunctions > 0
    ? (coveredFunctions / totalFunctions) * 100
    : 0;

  // Print colorful header
  console.log("");
  console.log(
    `${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.cyan}║${colors.reset}              ${colors.bold}E2E COVERAGE REPORT${colors.reset}                              ${colors.bold}${colors.cyan}║${colors.reset}`,
  );
  console.log(
    `${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`,
  );
  console.log("");

  // Overall summary
  console.log(`${colors.bold}📊 Overall Coverage${colors.reset}`);
  console.log(`   Files:      ${colors.bold}${files.length}${colors.reset}`);
  console.log(
    `   Statements: ${createProgressBar(totalStmtPct)} ${
      formatPct(totalStmtPct)
    } (${coveredStatements}/${totalStatements})`,
  );
  console.log(
    `   Functions:  ${createProgressBar(totalFnPct)} ${
      formatPct(totalFnPct)
    } (${coveredFunctions}/${totalFunctions})`,
  );
  console.log("");

  // Files needing attention (< 50% coverage)
  const needsWork = fileStats.filter((f) => f.stmtPct < 50);
  if (needsWork.length > 0) {
    console.log(
      `${colors.bold}${colors.red}⚠️  Files Needing Attention (< 50% coverage)${colors.reset}`,
    );
    console.log(`${"─".repeat(66)}`);
    for (const stat of needsWork) {
      console.log(`   ${colors.dim}${stat.readableName}${colors.reset}`);
      console.log(
        `   ${createProgressBar(stat.stmtPct, 30)} ${formatPct(stat.stmtPct)}`,
      );
    }
    console.log("");
  }

  // Files with moderate coverage (50-79%)
  const moderate = fileStats.filter((f) => f.stmtPct >= 50 && f.stmtPct < 80);
  if (moderate.length > 0) {
    console.log(
      `${colors.bold}${colors.yellow}📈 Moderate Coverage (50-79%)${colors.reset}`,
    );
    console.log(`${"─".repeat(66)}`);
    for (const stat of moderate) {
      console.log(`   ${colors.dim}${stat.readableName}${colors.reset}`);
      console.log(
        `   ${createProgressBar(stat.stmtPct, 30)} ${formatPct(stat.stmtPct)}`,
      );
    }
    console.log("");
  }

  // Files with good coverage (>= 80%)
  const good = fileStats.filter((f) => f.stmtPct >= 80);
  if (good.length > 0) {
    console.log(
      `${colors.bold}${colors.green}✅ Good Coverage (≥ 80%)${colors.reset}`,
    );
    console.log(`${"─".repeat(66)}`);
    for (const stat of good) {
      console.log(`   ${colors.dim}${stat.readableName}${colors.reset}`);
      console.log(
        `   ${createProgressBar(stat.stmtPct, 30)} ${formatPct(stat.stmtPct)}`,
      );
    }
    console.log("");
  }

  // Summary footer
  const statusColor = totalStmtPct >= 80
    ? colors.green
    : totalStmtPct >= 60
    ? colors.yellow
    : colors.red;
  const statusIcon = totalStmtPct >= 80
    ? "✅"
    : totalStmtPct >= 60
    ? "📈"
    : "⚠️";
  console.log(
    `${colors.bold}${colors.cyan}─────────────────────────────────────────────────────────────────${colors.reset}`,
  );
  console.log(
    `${statusIcon} ${colors.bold}Status:${colors.reset} ${statusColor}${
      totalStmtPct.toFixed(1)
    }% statement coverage${colors.reset}`,
  );
  console.log("");
}

/**
 * Clear accumulated coverage data (for testing)
 */
export function clearCoverageData(): void {
  allCoverageData.length = 0;
}

/**
 * Check if coverage is enabled
 */
export function isCoverageEnabled(): boolean {
  return coverageEnabled;
}

// Export for testing only
export const _testing = {
  convertToIstanbul,
  generateSummary,
  getAllCoverageData: () => allCoverageData,
};
