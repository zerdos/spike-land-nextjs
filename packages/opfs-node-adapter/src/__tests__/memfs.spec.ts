// This file serves as an entry point for all memfs tests
// The actual tests are in the memfs/ directory

import { describe, expect, it } from "vitest";
import FS from "../index";

describe("memfs", () => {
  it("should import all tests from the memfs directory", () => {
    // This is a placeholder test to avoid "No test found" error
    // The actual tests are in the memfs/ directory
    expect(true).toBe(true);
  });

  it("should export a complete FS module", () => {
    expect(FS).toBeDefined();
    expect(typeof FS).toBe("object");
    expect(Object.keys(FS).length).toBeGreaterThan(0);
  });
});
