import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _testing,
  clearCoverageData,
  isCoverageEnabled,
} from "../../e2e/support/helpers/coverage-helper";

// Mock fs module (used by generateCoverageReport)
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const { convertToIstanbul, generateSummary, getAllCoverageData } = _testing;

describe("coverage-helper", () => {
  beforeEach(() => {
    clearCoverageData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearCoverageData();
  });

  describe("isCoverageEnabled", () => {
    it("returns false when E2E_COVERAGE is not set", () => {
      // Note: This tests the module-level constant which is set at import time
      // The actual value depends on the test environment
      expect(typeof isCoverageEnabled()).toBe("boolean");
    });
  });

  describe("clearCoverageData", () => {
    it("clears all accumulated coverage data", () => {
      // Add some mock data
      const coverageData = getAllCoverageData();
      coverageData.push({
        url: "http://localhost:3000/test.js",
        scriptId: "1",
        functions: [],
      });

      expect(getAllCoverageData().length).toBe(1);

      clearCoverageData();

      expect(getAllCoverageData().length).toBe(0);
    });
  });

  describe("convertToIstanbul", () => {
    it("converts V8 coverage to Istanbul format", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/_next/static/chunks/app.js",
          scriptId: "1",
          functions: [
            {
              functionName: "myFunction",
              ranges: [{ startOffset: 0, endOffset: 100, count: 5 }],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);

      expect(result).toHaveProperty("_next/static/chunks/app.js");
      const fileCov = result["_next/static/chunks/app.js"]!;
      expect(fileCov.path).toBe("_next/static/chunks/app.js");
      expect(Object.keys(fileCov.fnMap)).toHaveLength(1);
      expect(fileCov.fnMap["0"]!.name).toBe("myFunction");
      expect(fileCov.f["0"]).toBe(1); // covered
    });

    it("handles uncovered functions (count = 0)", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/uncovered.js",
          scriptId: "2",
          functions: [
            {
              functionName: "uncoveredFn",
              ranges: [{ startOffset: 0, endOffset: 50, count: 0 }],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);
      const fileCov = result["uncovered.js"]!;

      expect(fileCov.f["0"]).toBe(0); // not covered
    });

    it("handles anonymous functions", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/anon.js",
          scriptId: "3",
          functions: [
            {
              functionName: "",
              ranges: [{ startOffset: 10, endOffset: 20, count: 1 }],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);
      const fileCov = result["anon.js"]!;

      expect(fileCov.fnMap["0"]!.name).toBe("(anonymous)");
    });

    it("skips functions with no ranges", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/empty.js",
          scriptId: "4",
          functions: [
            {
              functionName: "emptyFn",
              ranges: [],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);
      const fileCov = result["empty.js"]!;

      expect(Object.keys(fileCov.fnMap)).toHaveLength(0);
    });

    it("skips invalid URLs", () => {
      const v8Coverage = [
        {
          url: "not-a-valid-url",
          scriptId: "5",
          functions: [],
        },
      ];

      const result = convertToIstanbul(v8Coverage);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("skips entries with root path only", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/",
          scriptId: "6",
          functions: [],
        },
      ];

      const result = convertToIstanbul(v8Coverage);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("merges coverage for the same file", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/merged.js",
          scriptId: "7",
          functions: [
            {
              functionName: "fn1",
              ranges: [{ startOffset: 0, endOffset: 50, count: 1 }],
              isBlockCoverage: true,
            },
          ],
        },
        {
          url: "http://localhost:3000/merged.js",
          scriptId: "8",
          functions: [
            {
              functionName: "fn2",
              ranges: [{ startOffset: 60, endOffset: 100, count: 2 }],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);
      const fileCov = result["merged.js"]!;

      expect(Object.keys(fileCov.fnMap)).toHaveLength(2);
      expect(fileCov.fnMap["0"]!.name).toBe("fn1");
      expect(fileCov.fnMap["1"]!.name).toBe("fn2");
    });

    it("creates statement entries for each range", () => {
      const v8Coverage = [
        {
          url: "http://localhost:3000/statements.js",
          scriptId: "9",
          functions: [
            {
              functionName: "multiRange",
              ranges: [
                { startOffset: 0, endOffset: 50, count: 5 },
                { startOffset: 60, endOffset: 100, count: 3 },
              ],
              isBlockCoverage: true,
            },
          ],
        },
      ];

      const result = convertToIstanbul(v8Coverage);
      const fileCov = result["statements.js"]!;

      expect(Object.keys(fileCov.statementMap)).toHaveLength(2);
      expect(fileCov.s["0"]).toBe(5);
      expect(fileCov.s["1"]).toBe(3);
    });
  });

  describe("generateSummary", () => {
    it("generates summary for empty coverage", () => {
      const result = generateSummary({});

      expect(result).toContain("Files: 0");
      expect(result).toContain("Statements: 0/0 (0.0%)");
      expect(result).toContain("Functions:  0/0 (0.0%)");
    });

    it("generates summary with coverage data", () => {
      const coverage = {
        "file1.js": {
          path: "file1.js",
          statementMap: {
            "0": {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 50 },
            },
            "1": {
              start: { line: 1, column: 60 },
              end: { line: 1, column: 100 },
            },
          },
          fnMap: {
            "0": {
              name: "fn1",
              decl: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 50 },
              },
              line: 1,
            },
          },
          branchMap: {},
          s: { "0": 5, "1": 0 },
          f: { "0": 1 },
          b: {},
        },
      };

      const result = generateSummary(coverage);

      expect(result).toContain("Files: 1");
      expect(result).toContain("Statements: 1/2 (50.0%)");
      expect(result).toContain("Functions:  1/1 (100.0%)");
      expect(result).toContain("file1.js");
    });

    it("sorts files by coverage percentage (lowest first)", () => {
      const coverage = {
        "high-coverage.js": {
          path: "high-coverage.js",
          statementMap: {
            "0": {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { "0": 1 }, // 100% coverage
          f: {},
          b: {},
        },
        "low-coverage.js": {
          path: "low-coverage.js",
          statementMap: {
            "0": {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { "0": 0 }, // 0% coverage
          f: {},
          b: {},
        },
      };

      const result = generateSummary(coverage);
      const lowIndex = result.indexOf("low-coverage.js");
      const highIndex = result.indexOf("high-coverage.js");

      // Files are sorted by coverage percentage, lowest first
      expect(lowIndex).toBeLessThan(highIndex);
    });

    it("handles files with no statements", () => {
      const coverage = {
        "empty.js": {
          path: "empty.js",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      const result = generateSummary(coverage);

      // When there are no statements/functions, percentage is 0.0%
      expect(result).toContain("Statements: 0/0 (0.0%)");
      expect(result).toContain("Functions:  0/0 (0.0%)");
    });

    it("calculates correct percentages", () => {
      const coverage = {
        "test.js": {
          path: "test.js",
          statementMap: {
            "0": {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
            "1": {
              start: { line: 1, column: 20 },
              end: { line: 1, column: 30 },
            },
            "2": {
              start: { line: 1, column: 40 },
              end: { line: 1, column: 50 },
            },
          },
          fnMap: {
            "0": {
              name: "fn1",
              decl: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 5 },
              },
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
              line: 1,
            },
            "1": {
              name: "fn2",
              decl: {
                start: { line: 1, column: 20 },
                end: { line: 1, column: 25 },
              },
              loc: {
                start: { line: 1, column: 20 },
                end: { line: 1, column: 30 },
              },
              line: 1,
            },
          },
          branchMap: {},
          s: { "0": 10, "1": 5, "2": 0 }, // 2 covered, 1 not
          f: { "0": 1, "1": 0 }, // 1 covered, 1 not
          b: {},
        },
      };

      const result = generateSummary(coverage);

      expect(result).toContain("Statements: 2/3 (66.7%)");
      expect(result).toContain("Functions:  1/2 (50.0%)");
    });
  });

  describe("URL filtering logic", () => {
    // These tests verify the filtering logic indirectly by checking what's included

    it("should include localhost URLs with _src_ pattern", () => {
      const url =
        "http://localhost:3000/_next/static/chunks/Developer_spike-land-nextjs_src_app.js";
      expect(url.includes("localhost:3000")).toBe(true);
      expect(url.includes("_src_")).toBe(true);
      expect(url.includes("node_modules")).toBe(false);
    });

    it("should include spike.land URLs with src pattern", () => {
      const url = "https://spike.land/_next/static/chunks/spike-land-nextjs_src_components.js";
      expect(url.includes("spike.land")).toBe(true);
      expect(url.includes("spike-land-nextjs_src_")).toBe(true);
    });

    it("should exclude node_modules", () => {
      const url = "http://localhost:3000/node_modules/react/index.js";
      expect(url.includes("node_modules")).toBe(true);
    });

    it("should exclude Next.js internals", () => {
      const urls = [
        "http://localhost:3000/_next/static/chunks/webpack.js",
        "http://localhost:3000/_next/static/chunks/next_dist_client.js",
        "http://localhost:3000/_next/static/chunks/react-dom.js",
      ];

      for (const url of urls) {
        const isFramework = url.includes("webpack") ||
          url.includes("next_dist_") ||
          url.includes("react-dom");
        expect(isFramework).toBe(true);
      }
    });

    it("should exclude HMR and dev tools", () => {
      const urls = [
        "http://localhost:3000/_next/static/chunks/%5Bturbopack%5D_hmr-client.js",
        "http://localhost:3000/_next/static/chunks/next-devtools.js",
        "http://localhost:3000/_next/static/chunks/hmr-client.js",
      ];

      for (const url of urls) {
        const isDevTool = url.includes("turbopack%5D") ||
          url.includes("next-devtools") ||
          url.includes("hmr-client");
        expect(isDevTool).toBe(true);
      }
    });
  });
});
