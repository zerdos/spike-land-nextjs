import { describe, expect, it } from "vitest";
import { getPersonaBySlug, getPrimaryPersonas, getSecondaryPersonas, PERSONAS } from "./personas";

describe("personas", () => {
  describe("PERSONAS constant", () => {
    it("should have 11 personas", () => {
      expect(PERSONAS).toHaveLength(11);
    });

    it("should have unique slugs", () => {
      const slugs = PERSONAS.map((p) => p.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it("should have unique ids", () => {
      const ids = PERSONAS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid priority values", () => {
      PERSONAS.forEach((persona) => {
        expect(["primary", "secondary"]).toContain(persona.priority);
      });
    });
  });

  describe("getPersonaBySlug", () => {
    it("should return persona for valid slug", () => {
      const persona = getPersonaBySlug("tech-savvy-grandson");
      expect(persona).toBeDefined();
      expect(persona?.name).toBe("The Tech-Savvy Grandson");
    });

    it("should return undefined for invalid slug", () => {
      const persona = getPersonaBySlug("nonexistent-persona");
      expect(persona).toBeUndefined();
    });
  });

  describe("getPrimaryPersonas", () => {
    it("should return 4 primary personas", () => {
      const primary = getPrimaryPersonas();
      expect(primary).toHaveLength(4);
    });

    it("should only include primary priority personas", () => {
      const primary = getPrimaryPersonas();
      primary.forEach((persona) => {
        expect(persona.priority).toBe("primary");
      });
    });
  });

  describe("getSecondaryPersonas", () => {
    it("should return 7 secondary personas", () => {
      const secondary = getSecondaryPersonas();
      expect(secondary).toHaveLength(7);
    });

    it("should only include secondary priority personas", () => {
      const secondary = getSecondaryPersonas();
      secondary.forEach((persona) => {
        expect(persona.priority).toBe("secondary");
      });
    });
  });

  describe("persona data structure", () => {
    it("should have all required fields", () => {
      PERSONAS.forEach((persona) => {
        expect(persona.id).toBeTruthy();
        expect(persona.slug).toBeTruthy();
        expect(persona.name).toBeTruthy();
        expect(persona.tagline).toBeTruthy();
        expect(persona.demographics).toBeTruthy();
        expect(persona.demographics.age).toBeTruthy();
        expect(persona.demographics.gender).toBeTruthy();
        expect(persona.demographics.income).toBeTruthy();
        expect(persona.demographics.location).toBeTruthy();
        expect(persona.demographics.platform).toBeTruthy();
        expect(persona.psychographics.length).toBeGreaterThan(0);
        expect(persona.painPoints.length).toBeGreaterThan(0);
        expect(persona.triggers.length).toBeGreaterThan(0);
        expect(persona.primaryHook).toBeTruthy();
        expect(persona.adCopyVariations.length).toBeGreaterThan(0);
        expect(persona.contentIdeas.length).toBeGreaterThan(0);
        expect(persona.emoji).toBeTruthy();
      });
    });

    it("should have notes only for sensitive personas", () => {
      const personasWithNotes = PERSONAS.filter((p) => p.note);
      expect(personasWithNotes.length).toBe(2); // Pet Owner and Memorial Creator
    });
  });
});
