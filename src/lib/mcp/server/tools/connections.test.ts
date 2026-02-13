import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  businessConnection: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  competitorMetric: { create: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerConnectionsTools } from "./connections";

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

describe("connections tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerConnectionsTools(registry, userId); });

  it("should register 7 connections tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(7);
  });

  describe("connections_list", () => {
    it("should list connections", async () => {
      mockPrisma.businessConnection.findMany.mockResolvedValue([
        { id: "c1", name: "Acme Corp", type: "partner", url: "https://acme.com", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("connections_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("Acme Corp");
    });

    it("should return empty message", async () => {
      mockPrisma.businessConnection.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("connections_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("No connections found");
    });
  });

  describe("connections_add", () => {
    it("should add connection", async () => {
      mockPrisma.businessConnection.create.mockResolvedValue({ id: "c2" });
      const handler = registry.handlers.get("connections_add")!;
      const result = await handler({ name: "New Corp", type: "vendor" });
      expect(getText(result)).toContain("Connection Added");
    });
  });

  describe("connections_update", () => {
    it("should update connection", async () => {
      mockPrisma.businessConnection.update.mockResolvedValue({ name: "Updated Corp", type: "partner" });
      const handler = registry.handlers.get("connections_update")!;
      const result = await handler({ connection_id: "c1", name: "Updated Corp" });
      expect(getText(result)).toContain("Connection Updated");
    });
  });

  describe("connections_delete", () => {
    it("should delete connection", async () => {
      mockPrisma.businessConnection.delete.mockResolvedValue({});
      const handler = registry.handlers.get("connections_delete")!;
      const result = await handler({ connection_id: "c1" });
      expect(getText(result)).toContain("Connection Deleted");
    });
  });

  describe("connections_track_competitor", () => {
    it("should track metric", async () => {
      mockPrisma.competitorMetric.create.mockResolvedValue({ id: "m1" });
      const handler = registry.handlers.get("connections_track_competitor")!;
      const result = await handler({ competitor_id: "c1", metric: "pricing", value: "$99/mo" });
      expect(getText(result)).toContain("Metric Recorded");
    });
  });

  describe("connections_competitor_report", () => {
    it("should return report", async () => {
      mockPrisma.competitorMetric.findMany.mockResolvedValue([
        { metric: "pricing", value: "$99/mo", recordedAt: new Date(), connection: { name: "Acme Corp" } },
      ]);
      const handler = registry.handlers.get("connections_competitor_report")!;
      const result = await handler({});
      expect(getText(result)).toContain("Acme Corp");
      expect(getText(result)).toContain("pricing");
    });

    it("should return empty message", async () => {
      mockPrisma.competitorMetric.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("connections_competitor_report")!;
      const result = await handler({});
      expect(getText(result)).toContain("No competitor data");
    });
  });

  describe("connections_search", () => {
    it("should search connections", async () => {
      mockPrisma.businessConnection.findMany.mockResolvedValue([
        { id: "c1", name: "Acme Corp", type: "partner" },
      ]);
      const handler = registry.handlers.get("connections_search")!;
      const result = await handler({ query: "acme" });
      expect(getText(result)).toContain("Acme Corp");
    });

    it("should return no results message", async () => {
      mockPrisma.businessConnection.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("connections_search")!;
      const result = await handler({ query: "nonexistent" });
      expect(getText(result)).toContain("No connections matching");
    });
  });
});
