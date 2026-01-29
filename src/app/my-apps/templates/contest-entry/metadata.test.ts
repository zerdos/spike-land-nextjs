/**
 * Tests for Contest Entry template metadata
 */

import { describe, expect, it } from "vitest";
import { contestEntryMetadata } from "./metadata";

describe("Contest Entry Template Metadata", () => {
  it("should have correct id", () => {
    expect(contestEntryMetadata.id).toBe("contest-entry");
  });

  it("should have a descriptive name", () => {
    expect(contestEntryMetadata.name).toBe("Contest Entry Form");
  });

  it("should have a description", () => {
    expect(contestEntryMetadata.description).toBeTruthy();
    expect(contestEntryMetadata.description.length).toBeGreaterThan(20);
  });

  it("should have correct purpose", () => {
    expect(contestEntryMetadata.purpose).toBe("contest");
  });

  it("should have relevant tags", () => {
    expect(Array.isArray(contestEntryMetadata.tags)).toBe(true);
    expect(contestEntryMetadata.tags.length).toBeGreaterThan(0);
    expect(contestEntryMetadata.tags).toContain("contest");
  });
});
