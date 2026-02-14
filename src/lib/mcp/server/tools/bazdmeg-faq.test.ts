import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  bazdmegFaqEntry: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerBazdmegFaqTools } from "./bazdmeg-faq";

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

describe("bazdmeg-faq tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerBazdmegFaqTools(registry, userId);
  });

  it("should register 4 bazdmeg FAQ tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
  });

  describe("bazdmeg_faq_list", () => {
    it("should list published FAQ entries", async () => {
      mockPrisma.bazdmegFaqEntry.findMany.mockResolvedValue([
        { id: "f1", question: "What is BAZDMEG?", answer: "A methodology", category: "general", isPublished: true, helpfulCount: 5 },
      ]);
      const handler = registry.handlers.get("bazdmeg_faq_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("What is BAZDMEG?");
      expect(getText(result)).toContain("1 entries");
      expect(mockPrisma.bazdmegFaqEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
        }),
      );
    });

    it("should filter by category", async () => {
      mockPrisma.bazdmegFaqEntry.findMany.mockResolvedValue([
        { id: "f2", question: "How to test?", answer: "Write tests", category: "testing", isPublished: true, helpfulCount: 2 },
      ]);
      const handler = registry.handlers.get("bazdmeg_faq_list")!;
      const result = await handler({ category: "testing" });
      expect(getText(result)).toContain("How to test?");
      expect(mockPrisma.bazdmegFaqEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true, category: "testing" },
        }),
      );
    });

    it("should return empty message when no entries", async () => {
      mockPrisma.bazdmegFaqEntry.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("bazdmeg_faq_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("No FAQ entries found");
    });
  });

  describe("bazdmeg_faq_create", () => {
    it("should create a FAQ entry", async () => {
      mockPrisma.bazdmegFaqEntry.create.mockResolvedValue({
        id: "new-1",
        question: "New question?",
        answer: "New answer",
        category: "general",
        sortOrder: 0,
      });
      const handler = registry.handlers.get("bazdmeg_faq_create")!;
      const result = await handler({ question: "New question?", answer: "New answer" });
      expect(getText(result)).toContain("FAQ entry created");
      expect(getText(result)).toContain("new-1");
    });
  });

  describe("bazdmeg_faq_update", () => {
    it("should update a FAQ entry", async () => {
      mockPrisma.bazdmegFaqEntry.update.mockResolvedValue({
        id: "f1",
        question: "Updated question?",
        answer: "Updated answer",
      });
      const handler = registry.handlers.get("bazdmeg_faq_update")!;
      const result = await handler({ id: "f1", question: "Updated question?" });
      expect(getText(result)).toContain("FAQ entry updated");
    });
  });

  describe("bazdmeg_faq_delete", () => {
    it("should delete a FAQ entry", async () => {
      mockPrisma.bazdmegFaqEntry.delete.mockResolvedValue({ id: "f1" });
      const handler = registry.handlers.get("bazdmeg_faq_delete")!;
      const result = await handler({ id: "f1" });
      expect(getText(result)).toContain("FAQ entry deleted");
    });
  });
});
