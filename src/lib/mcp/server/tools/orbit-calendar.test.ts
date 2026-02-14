import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  calendarContentSuggestion: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitCalendarTools } from "./orbit-calendar";

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

describe("orbit-calendar tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerOrbitCalendarTools(registry, userId); });

  it("should register 5 orbit-calendar tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
  });

  describe("calendar_list_events", () => {
    it("should list events", async () => {
      mockPrisma.calendarContentSuggestion.findMany.mockResolvedValue([
        { id: "ev1", content: "Launch Post", platform: "TWITTER", status: "PENDING", suggestedFor: new Date("2025-07-01T10:00:00Z"), reason: "Product launch" },
      ]);
      const handler = registry.handlers.get("calendar_list_events")!;
      const result = await handler({});
      expect(getText(result)).toContain("Launch Post");
    });

    it("should return message when no events", async () => {
      mockPrisma.calendarContentSuggestion.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("calendar_list_events")!;
      const result = await handler({});
      expect(getText(result)).toContain("No calendar events found");
    });
  });

  describe("calendar_create_event", () => {
    it("should create event", async () => {
      mockPrisma.calendarContentSuggestion.create.mockResolvedValue({ id: "ev2" });
      const handler = registry.handlers.get("calendar_create_event")!;
      const result = await handler({ content: "Hello!", suggested_for: "2025-07-01T10:00:00Z", platform: "TWITTER", reason: "Engagement boost" });
      expect(getText(result)).toContain("Event Created");
    });
  });

  describe("calendar_update_event", () => {
    it("should update event", async () => {
      mockPrisma.calendarContentSuggestion.update.mockResolvedValue({ id: "ev1", status: "REJECTED" });
      const handler = registry.handlers.get("calendar_update_event")!;
      const result = await handler({ event_id: "ev1", status: "REJECTED" });
      expect(getText(result)).toContain("Event Updated");
    });
  });

  describe("calendar_delete_event", () => {
    it("should delete event", async () => {
      mockPrisma.calendarContentSuggestion.delete.mockResolvedValue({});
      const handler = registry.handlers.get("calendar_delete_event")!;
      const result = await handler({ event_id: "ev1" });
      expect(getText(result)).toContain("Event Deleted");
    });
  });

  describe("calendar_overview", () => {
    it("should return monthly overview", async () => {
      mockPrisma.calendarContentSuggestion.findMany.mockResolvedValue([
        { platform: "TWITTER", status: "PENDING" },
        { platform: "TWITTER", status: "ACCEPTED" },
        { platform: "INSTAGRAM", status: "PENDING" },
      ]);
      const handler = registry.handlers.get("calendar_overview")!;
      const result = await handler({ month: 7, year: 2025 });
      expect(getText(result)).toContain("Calendar Overview");
      expect(getText(result)).toContain("Total Events:** 3");
    });
  });
});
