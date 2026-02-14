import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  agencyPersona: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerAgencyTools } from "./agency";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("agency tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerAgencyTools(registry, userId); });

  it("should register 5 agency tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
  });

  describe("agency_list_personas", () => {
    it("should list personas", async () => {
      mockPrisma.agencyPersona.findMany.mockResolvedValue([
        { id: "p1", slug: "busy-mom", name: "Busy Mom", tagline: "Always on the go", predictedProfit: 85, stressLevel: 8, rank: 1 },
      ]);
      const handler = registry.handlers.get("agency_list_personas")!;
      const result = await handler({});
      expect(getText(result)).toContain("Busy Mom");
      expect(getText(result)).toContain("busy-mom");
      expect(getText(result)).toContain("Rank #1");
      expect(getText(result)).toContain("Profit: 85%");
      expect(getText(result)).toContain("Stress: 8/10");
      expect(getText(result)).toContain("Always on the go");
      expect(getText(result)).toContain("Personas (1)");
    });

    it("should return empty message when no personas found", async () => {
      mockPrisma.agencyPersona.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("agency_list_personas")!;
      const result = await handler({});
      expect(getText(result)).toContain("No personas found");
    });

    it("should respect limit and offset", async () => {
      mockPrisma.agencyPersona.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("agency_list_personas")!;
      await handler({ limit: 5, offset: 10 });
      expect(mockPrisma.agencyPersona.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10,
        take: 5,
      }));
    });

    it("should use default limit and offset", async () => {
      mockPrisma.agencyPersona.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("agency_list_personas")!;
      await handler({});
      expect(mockPrisma.agencyPersona.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 20,
      }));
    });

    it("should list multiple personas", async () => {
      mockPrisma.agencyPersona.findMany.mockResolvedValue([
        { id: "p1", slug: "busy-mom", name: "Busy Mom", tagline: "Always on the go", predictedProfit: 85, stressLevel: 8, rank: 1 },
        { id: "p2", slug: "tech-bro", name: "Tech Bro", tagline: "Move fast", predictedProfit: 72, stressLevel: 5, rank: 2 },
      ]);
      const handler = registry.handlers.get("agency_list_personas")!;
      const result = await handler({});
      expect(getText(result)).toContain("Personas (2)");
      expect(getText(result)).toContain("Busy Mom");
      expect(getText(result)).toContain("Tech Bro");
    });
  });

  describe("agency_get_persona", () => {
    it("should return persona details", async () => {
      mockPrisma.agencyPersona.findUnique.mockResolvedValue({
        id: "p1",
        slug: "busy-mom",
        name: "Busy Mom",
        tagline: "Always on the go",
        demographics: { age: "30-45", income: "high" },
        psychographics: ["time-conscious", "health-focused"],
        painPoints: ["lack of time", "expensive options"],
        primaryHook: "Save 2 hours a day",
        predictedProfit: 85,
        stressLevel: 8,
        rank: 1,
      });
      const handler = registry.handlers.get("agency_get_persona")!;
      const result = await handler({ slug: "busy-mom" });
      expect(getText(result)).toContain("Busy Mom");
      expect(getText(result)).toContain("busy-mom");
      expect(getText(result)).toContain("Always on the go");
      expect(getText(result)).toContain("time-conscious, health-focused");
      expect(getText(result)).toContain("lack of time, expensive options");
      expect(getText(result)).toContain("Save 2 hours a day");
      expect(getText(result)).toContain("85%");
      expect(getText(result)).toContain("8/10");
      expect(getText(result)).toContain("#1");
    });

    it("should return NOT_FOUND for missing persona", async () => {
      mockPrisma.agencyPersona.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("agency_get_persona")!;
      const result = await handler({ slug: "nonexistent" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should handle null demographics", async () => {
      mockPrisma.agencyPersona.findUnique.mockResolvedValue({
        id: "p2",
        slug: "minimal",
        name: "Minimal",
        tagline: "Simple",
        demographics: null,
        psychographics: [],
        painPoints: [],
        primaryHook: "Just works",
        predictedProfit: 50,
        stressLevel: 3,
        rank: 5,
      });
      const handler = registry.handlers.get("agency_get_persona")!;
      const result = await handler({ slug: "minimal" });
      expect(getText(result)).toContain("(none)");
    });

    it("should handle empty psychographics and pain points", async () => {
      mockPrisma.agencyPersona.findUnique.mockResolvedValue({
        id: "p3",
        slug: "empty",
        name: "Empty",
        tagline: "Nothing",
        demographics: { age: "20" },
        psychographics: [],
        painPoints: [],
        primaryHook: "Hook",
        predictedProfit: 10,
        stressLevel: 1,
        rank: 10,
      });
      const handler = registry.handlers.get("agency_get_persona")!;
      const result = await handler({ slug: "empty" });
      const text = getText(result);
      // Empty arrays should show "(none)" for both psychographics and pain points
      expect(text).toContain("**Psychographics:** (none)");
      expect(text).toContain("**Pain Points:** (none)");
    });
  });

  describe("agency_create_persona", () => {
    it("should create a persona with required fields", async () => {
      mockPrisma.agencyPersona.create.mockResolvedValue({ id: "p-new", name: "New Persona", slug: "new-persona" });
      const handler = registry.handlers.get("agency_create_persona")!;
      const result = await handler({
        name: "New Persona",
        slug: "new-persona",
        tagline: "Fresh start",
        primaryHook: "Start fresh today",
      });
      expect(getText(result)).toContain("Persona Created");
      expect(getText(result)).toContain("New Persona");
      expect(getText(result)).toContain("new-persona");
      expect(mockPrisma.agencyPersona.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New Persona",
          slug: "new-persona",
          tagline: "Fresh start",
          primaryHook: "Start fresh today",
          psychographics: [],
          painPoints: [],
          triggers: [],
          adCopyVariations: [],
          predictedProfit: 0,
          stressLevel: 0,
          rank: 1,
        }),
      });
    });

    it("should create a persona with all optional fields", async () => {
      mockPrisma.agencyPersona.create.mockResolvedValue({ id: "p-full", name: "Full Persona", slug: "full-persona" });
      const handler = registry.handlers.get("agency_create_persona")!;
      const result = await handler({
        name: "Full Persona",
        slug: "full-persona",
        tagline: "Complete",
        demographics: '{"age":"25-35"}',
        psychographics: ["trait1", "trait2"],
        painPoints: ["pain1"],
        triggers: ["trigger1"],
        primaryHook: "Best hook",
        adCopyVariations: ["copy1", "copy2"],
        predictedProfit: 90,
        stressLevel: 7,
        rank: 2,
      });
      expect(getText(result)).toContain("Persona Created");
      expect(mockPrisma.agencyPersona.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Full Persona",
          slug: "full-persona",
          tagline: "Complete",
          demographics: { age: "25-35" },
          psychographics: ["trait1", "trait2"],
          painPoints: ["pain1"],
          triggers: ["trigger1"],
          primaryHook: "Best hook",
          adCopyVariations: ["copy1", "copy2"],
          predictedProfit: 90,
          stressLevel: 7,
          rank: 2,
        }),
      });
    });

    it("should default demographics to empty object when not provided", async () => {
      mockPrisma.agencyPersona.create.mockResolvedValue({ id: "p-no-demo", name: "No Demo", slug: "no-demo" });
      const handler = registry.handlers.get("agency_create_persona")!;
      await handler({
        name: "No Demo",
        slug: "no-demo",
        tagline: "Simple",
        primaryHook: "Hook",
      });
      expect(mockPrisma.agencyPersona.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          demographics: {},
        }),
      });
    });
  });

  describe("agency_update_persona", () => {
    it("should update persona fields", async () => {
      mockPrisma.agencyPersona.update.mockResolvedValue({ name: "Updated Name", slug: "updated-slug" });
      const handler = registry.handlers.get("agency_update_persona")!;
      const result = await handler({ persona_id: "p1", name: "Updated Name", tagline: "New tagline" });
      expect(getText(result)).toContain("Persona Updated");
      expect(getText(result)).toContain("Updated Name");
      expect(mockPrisma.agencyPersona.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { name: "Updated Name", tagline: "New tagline" },
      });
    });

    it("should update all optional fields", async () => {
      mockPrisma.agencyPersona.update.mockResolvedValue({ name: "Full Update", slug: "full-update" });
      const handler = registry.handlers.get("agency_update_persona")!;
      await handler({
        persona_id: "p1",
        name: "Full Update",
        tagline: "New tagline",
        demographics: '{"age":"40-50"}',
        psychographics: ["new-trait"],
        painPoints: ["new-pain"],
        triggers: ["new-trigger"],
        primaryHook: "New hook",
        adCopyVariations: ["new-copy"],
        predictedProfit: 95,
        stressLevel: 9,
        rank: 3,
      });
      expect(mockPrisma.agencyPersona.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: {
          name: "Full Update",
          tagline: "New tagline",
          demographics: { age: "40-50" },
          psychographics: ["new-trait"],
          painPoints: ["new-pain"],
          triggers: ["new-trigger"],
          primaryHook: "New hook",
          adCopyVariations: ["new-copy"],
          predictedProfit: 95,
          stressLevel: 9,
          rank: 3,
        },
      });
    });

    it("should handle update with no optional fields", async () => {
      mockPrisma.agencyPersona.update.mockResolvedValue({ name: "Same", slug: "same" });
      const handler = registry.handlers.get("agency_update_persona")!;
      const result = await handler({ persona_id: "p1" });
      expect(getText(result)).toContain("Persona Updated");
      expect(mockPrisma.agencyPersona.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: {},
      });
    });
  });

  describe("agency_delete_persona", () => {
    it("should delete a persona", async () => {
      mockPrisma.agencyPersona.delete.mockResolvedValue({});
      const handler = registry.handlers.get("agency_delete_persona")!;
      const result = await handler({ persona_id: "p1" });
      expect(getText(result)).toContain("Persona Deleted");
      expect(getText(result)).toContain("p1");
      expect(mockPrisma.agencyPersona.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    });
  });
});
