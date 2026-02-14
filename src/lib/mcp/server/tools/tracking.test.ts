import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  visitorSession: { findMany: vi.fn(), groupBy: vi.fn() },
  pageView: { findMany: vi.fn() },
  analyticsEvent: { findMany: vi.fn() },
  workspace: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerTrackingTools } from "./tracking";

const WORKSPACE = { id: "ws-1", slug: "my-ws", name: "My Workspace" };

describe("tracking tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerTrackingTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 4 tracking tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(4);
    expect(registry.handlers.has("tracking_get_sessions")).toBe(true);
    expect(registry.handlers.has("tracking_get_attribution")).toBe(true);
    expect(registry.handlers.has("tracking_get_journey")).toBe(true);
    expect(registry.handlers.has("tracking_query_events")).toBe(true);
  });

  describe("tracking_get_sessions", () => {
    it("should return visitor sessions", async () => {
      mockPrisma.visitorSession.findMany.mockResolvedValue([
        {
          id: "sess-1",
          visitorId: "v-1",
          source: "google",
          duration: 120,
          pageCount: 5,
          startedAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("tracking_get_sessions")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Visitor Sessions (1)");
      expect(text).toContain("sess-1");
      expect(text).toContain("google");
      expect(text).toContain("120s");
      expect(text).toContain("Pages: 5");
    });

    it("should handle no sessions", async () => {
      mockPrisma.visitorSession.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("tracking_get_sessions")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No visitor sessions found");
    });

    it("should show defaults for anonymous sessions", async () => {
      mockPrisma.visitorSession.findMany.mockResolvedValue([
        {
          id: "sess-2",
          startedAt: new Date("2025-06-02"),
        },
      ]);

      const handler = registry.handlers.get("tracking_get_sessions")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("anonymous");
      expect(text).toContain("direct");
    });
  });

  describe("tracking_get_attribution", () => {
    it("should return attribution report", async () => {
      mockPrisma.visitorSession.groupBy.mockResolvedValue([
        { source: "google", medium: "cpc", campaign: "summer", _count: { id: 42 } },
        { source: "twitter", medium: "social", campaign: null, _count: { id: 15 } },
      ]);

      const handler = registry.handlers.get("tracking_get_attribution")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Attribution Report");
      expect(text).toContain("google");
      expect(text).toContain("cpc");
      expect(text).toContain("summer");
      expect(text).toContain("42");
      expect(text).toContain("twitter");
    });

    it("should handle no attribution data", async () => {
      mockPrisma.visitorSession.groupBy.mockResolvedValue([]);

      const handler = registry.handlers.get("tracking_get_attribution")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No attribution data found");
    });
  });

  describe("tracking_get_journey", () => {
    it("should return session page journey", async () => {
      mockPrisma.pageView.findMany.mockResolvedValue([
        { path: "/home", duration: 30, viewedAt: new Date("2025-06-01T10:00:00Z") },
        { path: "/products", duration: 45, viewedAt: new Date("2025-06-01T10:01:00Z") },
        { path: "/checkout", duration: 60, viewedAt: new Date("2025-06-01T10:02:00Z") },
      ]);

      const handler = registry.handlers.get("tracking_get_journey")!;
      const result = await handler({ workspace_slug: "my-ws", session_id: "sess-1" });
      const text = getText(result);
      expect(text).toContain("Session Journey (3 pages)");
      expect(text).toContain("/home");
      expect(text).toContain("/products");
      expect(text).toContain("/checkout");
      expect(text).toContain("30s");
    });

    it("should handle empty journey", async () => {
      mockPrisma.pageView.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("tracking_get_journey")!;
      const result = await handler({ workspace_slug: "my-ws", session_id: "bad-id" });
      const text = getText(result);
      expect(text).toContain("No page views found");
    });
  });

  describe("tracking_query_events", () => {
    it("should return analytics events", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { name: "page_view", properties: { path: "/home" }, createdAt: new Date("2025-06-01T10:00:00Z") },
        { name: "button_click", properties: { button: "cta" }, createdAt: new Date("2025-06-01T10:01:00Z") },
      ]);

      const handler = registry.handlers.get("tracking_query_events")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Analytics Events (2)");
      expect(text).toContain("page_view");
      expect(text).toContain("button_click");
      expect(text).toContain("/home");
    });

    it("should filter by event name", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([
        { name: "purchase", properties: { amount: 50 }, createdAt: new Date("2025-06-01") },
      ]);

      const handler = registry.handlers.get("tracking_query_events")!;
      const result = await handler({ workspace_slug: "my-ws", event_name: "purchase" });
      const text = getText(result);
      expect(text).toContain("purchase");
      expect(mockPrisma.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: "purchase" }),
        }),
      );
    });

    it("should handle no events", async () => {
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("tracking_query_events")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No analytics events found");
    });
  });
});
