/**
 * Tests for Ralph Shared Utilities
 */

import { describe, expect, it } from "vitest";
import {
  escapeForShell,
  isNumericIssue,
  isOlderThanHours,
  nowISO,
  safeArrayGet,
  validateIssueNumber,
  validateRepoFormat,
} from "../utils";

describe("validateRepoFormat", () => {
  it("accepts valid repo format (owner/repo)", () => {
    expect(validateRepoFormat("zerdos/spike-land-nextjs")).toBe(true);
    expect(validateRepoFormat("facebook/react")).toBe(true);
    expect(validateRepoFormat("owner-name/repo-name")).toBe(true);
    expect(validateRepoFormat("owner_name/repo_name")).toBe(true);
  });

  it("accepts repos with dots in name", () => {
    expect(validateRepoFormat("owner/repo.js")).toBe(true);
    expect(validateRepoFormat("vercel/next.js")).toBe(true);
  });

  it("rejects invalid repo formats", () => {
    expect(validateRepoFormat("noslash")).toBe(false);
    expect(validateRepoFormat("")).toBe(false);
    expect(validateRepoFormat("/")).toBe(false);
    expect(validateRepoFormat("owner/")).toBe(false);
    expect(validateRepoFormat("/repo")).toBe(false);
  });

  it("rejects command injection attempts", () => {
    expect(validateRepoFormat("owner; rm -rf /")).toBe(false);
    expect(validateRepoFormat("owner/repo; malicious")).toBe(false);
    expect(validateRepoFormat("$(whoami)/repo")).toBe(false);
    expect(validateRepoFormat("owner/$(cat /etc/passwd)")).toBe(false);
    expect(validateRepoFormat('owner/repo" && echo "hacked')).toBe(false);
    expect(validateRepoFormat("owner/repo`id`")).toBe(false);
    expect(validateRepoFormat("owner/repo\nmalicious")).toBe(false);
  });
});

describe("validateIssueNumber", () => {
  it("accepts positive integers", () => {
    expect(validateIssueNumber(1)).toBe(true);
    expect(validateIssueNumber(100)).toBe(true);
    expect(validateIssueNumber(12345)).toBe(true);
    expect(validateIssueNumber(999999)).toBe(true);
  });

  it("rejects zero", () => {
    expect(validateIssueNumber(0)).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(validateIssueNumber(-1)).toBe(false);
    expect(validateIssueNumber(-100)).toBe(false);
  });

  it("rejects non-integers (floats)", () => {
    expect(validateIssueNumber(1.5)).toBe(false);
    expect(validateIssueNumber(100.1)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(validateIssueNumber(NaN)).toBe(false);
    expect(validateIssueNumber(Infinity)).toBe(false);
    expect(validateIssueNumber(-Infinity)).toBe(false);
  });

  it("rejects very large numbers (potential overflow)", () => {
    expect(validateIssueNumber(1000000)).toBe(false);
    expect(validateIssueNumber(Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe("isNumericIssue", () => {
  it("accepts numeric strings", () => {
    expect(isNumericIssue("123")).toBe(true);
    expect(isNumericIssue("1")).toBe(true);
    expect(isNumericIssue("999999")).toBe(true);
  });

  it("accepts strings with whitespace (trimmed)", () => {
    expect(isNumericIssue(" 123 ")).toBe(true);
    expect(isNumericIssue("  456")).toBe(true);
  });

  it("rejects non-numeric strings", () => {
    expect(isNumericIssue("abc")).toBe(false);
    expect(isNumericIssue("12a")).toBe(false);
    expect(isNumericIssue("")).toBe(false);
    expect(isNumericIssue("#123")).toBe(false);
  });

  it("rejects injection attempts", () => {
    expect(isNumericIssue("123; rm -rf")).toBe(false);
    expect(isNumericIssue("$(id)")).toBe(false);
  });
});

describe("escapeForShell", () => {
  it("escapes backslashes", () => {
    expect(escapeForShell("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("escapes double quotes", () => {
    expect(escapeForShell('say "hello"')).toBe('say \\"hello\\"');
  });

  it("escapes single quotes", () => {
    expect(escapeForShell("it's")).toBe("it'\\''s");
  });

  it("escapes dollar signs (variable expansion)", () => {
    expect(escapeForShell("$HOME")).toBe("\\$HOME");
    expect(escapeForShell("${USER}")).toBe("\\${USER}");
  });

  it("escapes backticks (command substitution)", () => {
    expect(escapeForShell("`whoami`")).toBe("\\`whoami\\`");
  });

  it("escapes exclamation marks (history expansion)", () => {
    expect(escapeForShell("hello!")).toBe("hello\\!");
  });

  it("escapes newlines", () => {
    expect(escapeForShell("line1\nline2")).toBe("line1\\nline2");
  });

  it("escapes carriage returns", () => {
    expect(escapeForShell("line1\rline2")).toBe("line1\\rline2");
  });

  it("escapes tabs", () => {
    expect(escapeForShell("col1\tcol2")).toBe("col1\\tcol2");
  });

  it("handles empty strings", () => {
    expect(escapeForShell("")).toBe("");
  });

  it("handles complex injection attempts", () => {
    const malicious = '"; rm -rf / #';
    const escaped = escapeForShell(malicious);
    // The escaped string should have quotes escaped
    expect(escaped).toContain('\\"');
    // Should escape special shell characters
    expect(escaped).toBe('\\"\\; rm -rf / #');
  });

  it("handles multiline command injection", () => {
    const malicious = "normal text\n; malicious command";
    const escaped = escapeForShell(malicious);
    expect(escaped).not.toContain("\n");
    expect(escaped).toContain("\\n");
  });
});

describe("nowISO", () => {
  it("returns a valid ISO string", () => {
    const result = nowISO();
    expect(() => new Date(result)).not.toThrow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("returns current time", () => {
    const before = Date.now();
    const result = nowISO();
    const after = Date.now();

    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});

describe("isOlderThanHours", () => {
  it("returns true for timestamps older than specified hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(isOlderThanHours(threeHoursAgo, 2)).toBe(true);
  });

  it("returns false for recent timestamps", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isOlderThanHours(oneHourAgo, 2)).toBe(false);
  });

  it("returns false for current timestamp", () => {
    const now = new Date().toISOString();
    expect(isOlderThanHours(now, 1)).toBe(false);
  });
});

describe("safeArrayGet", () => {
  it("returns element at valid index", () => {
    const arr = ["a", "b", "c"];
    expect(safeArrayGet(arr, 0)).toBe("a");
    expect(safeArrayGet(arr, 1)).toBe("b");
    expect(safeArrayGet(arr, 2)).toBe("c");
  });

  it("returns undefined for negative index", () => {
    const arr = ["a", "b", "c"];
    expect(safeArrayGet(arr, -1)).toBeUndefined();
  });

  it("returns undefined for out of bounds index", () => {
    const arr = ["a", "b", "c"];
    expect(safeArrayGet(arr, 3)).toBeUndefined();
    expect(safeArrayGet(arr, 100)).toBeUndefined();
  });

  it("returns undefined for empty array", () => {
    const arr: string[] = [];
    expect(safeArrayGet(arr, 0)).toBeUndefined();
  });
});
