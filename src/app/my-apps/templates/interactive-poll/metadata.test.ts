/**
 * Tests for Interactive Poll template metadata
 */

import { describe, expect, it } from "vitest";
import { interactivePollMetadata } from "./metadata";

describe("Interactive Poll Template Metadata", () => {
  it("should have correct id", () => {
    expect(interactivePollMetadata.id).toBe("interactive-poll");
  });

  it("should have a descriptive name", () => {
    expect(interactivePollMetadata.name).toBe("Interactive Poll");
  });

  it("should have a description", () => {
    expect(interactivePollMetadata.description).toBeTruthy();
    expect(interactivePollMetadata.description.length).toBeGreaterThan(20);
  });

  it("should have correct purpose", () => {
    expect(interactivePollMetadata.purpose).toBe("poll");
  });

  it("should have relevant tags", () => {
    expect(Array.isArray(interactivePollMetadata.tags)).toBe(true);
    expect(interactivePollMetadata.tags.length).toBeGreaterThan(0);
    expect(interactivePollMetadata.tags).toContain("poll");
  });
});
