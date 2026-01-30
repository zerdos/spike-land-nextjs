/**
 * Tests for template registry
 */

import { describe, expect, it } from "vitest";
import { getAllTemplates, getTemplateById, templates } from "./index";

describe("Template Registry", () => {
  describe("templates array", () => {
    it("should export an array of templates", () => {
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it("should have all 4 expected templates", () => {
      expect(templates.length).toBe(4);

      const ids = templates.map((t) => t.id);
      expect(ids).toContain("link-in-bio");
      expect(ids).toContain("campaign-landing");
      expect(ids).toContain("interactive-poll");
      expect(ids).toContain("contest-entry");
    });

    it("should have valid template objects with all required fields", () => {
      templates.forEach((template) => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.purpose).toBeTruthy();
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.code).toBeTruthy();
        expect(typeof template.code).toBe("string");
      });
    });

    it("should have unique template IDs", () => {
      const ids = templates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getTemplateById", () => {
    it("should return the correct template for valid ID", () => {
      const template = getTemplateById("link-in-bio");

      expect(template).toBeDefined();
      expect(template?.id).toBe("link-in-bio");
      expect(template?.name).toBe("Link-in-Bio Page");
      expect(template?.purpose).toBe("link-in-bio");
    });

    it("should return undefined for invalid ID", () => {
      const template = getTemplateById("non-existent-template");

      expect(template).toBeUndefined();
    });

    it("should return templates with code", () => {
      const template = getTemplateById("campaign-landing");

      expect(template).toBeDefined();
      expect(template?.code).toBeTruthy();
      expect(template?.code.length).toBeGreaterThan(100);
    });
  });

  describe("getAllTemplates", () => {
    it("should return all templates", () => {
      const allTemplates = getAllTemplates();

      expect(allTemplates).toEqual(templates);
      expect(allTemplates.length).toBe(4);
    });

    it("should return templates with complete data", () => {
      const allTemplates = getAllTemplates();

      allTemplates.forEach((template) => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.purpose).toBeTruthy();
        expect(template.tags.length).toBeGreaterThan(0);
        expect(template.code).toBeTruthy();
      });
    });
  });

  describe("Template Content Validation", () => {
    it("link-in-bio should have valid React code", () => {
      const template = getTemplateById("link-in-bio");

      expect(template?.code).toContain("export default function");
      expect(template?.code).toContain("useState");
    });

    it("campaign-landing should have valid React code", () => {
      const template = getTemplateById("campaign-landing");

      expect(template?.code).toContain("export default function");
      expect(template?.code).toContain("useState");
      expect(template?.code).toContain("handleSubmit");
    });

    it("interactive-poll should have valid React code", () => {
      const template = getTemplateById("interactive-poll");

      expect(template?.code).toContain("export default function");
      expect(template?.code).toContain("useState");
      expect(template?.code).toContain("handleVote");
    });

    it("contest-entry should have valid React code", () => {
      const template = getTemplateById("contest-entry");

      expect(template?.code).toContain("export default function");
      expect(template?.code).toContain("useState");
      expect(template?.code).toContain("validate");
    });
  });
});
