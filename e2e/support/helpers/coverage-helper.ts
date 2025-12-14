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
      const isAppUrl = url.includes("localhost:3000") || url.includes("spike.land");
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
    let stmtIdx = Object.keys(fileCov.statementMap).length;
    let fnIdx = Object.keys(fileCov.fnMap).length;

    // Convert function coverage
    for (const fn of entry.functions) {
      if (fn.ranges.length === 0) continue;

      const range = fn.ranges[0];
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
    console.log("[Coverage] Coverage not enabled. Set E2E_COVERAGE=true to enable.");
    return;
  }

  if (allCoverageData.length === 0) {
    console.log("[Coverage] No coverage data collected.");
    return;
  }

  console.log(`[Coverage] Generating report from ${allCoverageData.length} entries...`);

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

  // Generate summary
  const summary = generateSummary(istanbulCoverage);
  const summaryPath = path.join(coverageDir, "coverage-summary.txt");
  fs.writeFileSync(summaryPath, summary);
  console.log(`[Coverage] Summary written to: ${summaryPath}`);

  // Print summary to console
  console.log("\n" + "=".repeat(60));
  console.log("E2E COVERAGE SUMMARY");
  console.log("=".repeat(60));
  console.log(summary);
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

  const lines: string[] = [];

  for (const filePath of files.sort()) {
    const fileCov = coverage[filePath];

    const fileStatements = Object.keys(fileCov.s).length;
    const fileCoveredStatements = Object.values(fileCov.s).filter((v) => v > 0).length;
    const fileFunctions = Object.keys(fileCov.f).length;
    const fileCoveredFunctions = Object.values(fileCov.f).filter((v) => v > 0).length;

    totalStatements += fileStatements;
    coveredStatements += fileCoveredStatements;
    totalFunctions += fileFunctions;
    coveredFunctions += fileCoveredFunctions;

    const stmtPct = fileStatements > 0
      ? ((fileCoveredStatements / fileStatements) * 100).toFixed(1)
      : "N/A";
    const fnPct = fileFunctions > 0
      ? ((fileCoveredFunctions / fileFunctions) * 100).toFixed(1)
      : "N/A";

    lines.push(`${filePath}`);
    lines.push(`  Statements: ${fileCoveredStatements}/${fileStatements} (${stmtPct}%)`);
    lines.push(`  Functions:  ${fileCoveredFunctions}/${fileFunctions} (${fnPct}%)`);
    lines.push("");
  }

  const totalStmtPct = totalStatements > 0
    ? ((coveredStatements / totalStatements) * 100).toFixed(1)
    : "0";
  const totalFnPct = totalFunctions > 0
    ? ((coveredFunctions / totalFunctions) * 100).toFixed(1)
    : "0";

  lines.unshift("");
  lines.unshift(`Functions:  ${coveredFunctions}/${totalFunctions} (${totalFnPct}%)`);
  lines.unshift(`Statements: ${coveredStatements}/${totalStatements} (${totalStmtPct}%)`);
  lines.unshift(`Files: ${files.length}`);
  lines.unshift("TOTALS:");
  lines.unshift("");

  return lines.join("\n");
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
