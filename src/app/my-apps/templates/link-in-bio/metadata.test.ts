/**
 * Tests for Link-in-Bio template metadata
 */

import { describe, expect, it } from "vitest";
import { linkInBioMetadata } from "./metadata";

describe("Link-in-Bio Template Metadata", () => {
  it("should have correct id", () => {
    expect(linkInBioMetadata.id).toBe("link-in-bio");
  });

  it("should have a descriptive name", () => {
    expect(linkInBioMetadata.name).toBe("Link-in-Bio Page");
  });

  it("should have a description", () => {
    expect(linkInBioMetadata.description).toBeTruthy();
    expect(linkInBioMetadata.description.length).toBeGreaterThan(20);
  });

  it("should have correct purpose", () => {
    expect(linkInBioMetadata.purpose).toBe("link-in-bio");
  });

  it("should have relevant tags", () => {
    expect(Array.isArray(linkInBioMetadata.tags)).toBe(true);
    expect(linkInBioMetadata.tags.length).toBeGreaterThan(0);
    expect(linkInBioMetadata.tags).toContain("social-media");
  });
});
