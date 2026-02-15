import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  visitorSession: { findMany: vi.fn(), groupBy: vi.fn() },
  pageView: { findMany: vi.fn() },
  analyticsEvent: { findMany: vi.fn(), create: vi.fn() },
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

  it("should register 5 tracking tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("tracking_get_sessions")).toBe(true);
    expect(registry.handlers.has("tracking_get_attribution")).toBe(true);
    expect(registry.handlers.has("tracking_get_journey")).toBe(true);
    expect(registry.handlers.has("tracking_query_events")).toBe(true);
    expect(registry.handlers.has("tracking_record_engagement")).toBe(true);
  });

  describe("tracking_get_sessions", () => {
    it("should return visitor sessions", async () => {
      mockPrisma.visitorSession.findMany.mockResolvedValue([
        {
          id: "sess-1",
          visitorId: "v-1",
          utmSource: "google",
          pageViewCount: 5,
          landingPage: "/home",
          sessionStart: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("tracking_get_sessions")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Visitor Sessions (1)");
      expect(text).toContain("sess-1");
      expect(text).toContain("google");
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
          visitorId: "anon-1",
          utmSource: null,
          pageViewCount: 0,
          landingPage: "/",
          sessionStart: new Date("2025-06-02"),
        },
      ]);

      const handler = registry.handlers.get("tracking_get_sessions")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("anon-1");
      expect(text).toContain("direct");
    });
  });

  describe("tracking_get_attribution", () => {
    it("should return attribution report", async () => {
      mockPrisma.visitorSession.groupBy.mockResolvedValue([
        { utmSource: "google", utmMedium: "cpc", utmCampaign: "summer", _count: { id: 42 } },
        { utmSource: "twitter", utmMedium: "social", utmCampaign: null, _count: { id: 15 } },
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
        { path: "/home", timeOnPage: 30, timestamp: new Date("2025-06-01T10:00:00Z") },
        { path: "/products", timeOnPage: 45, timestamp: new Date("2025-06-01T10:01:00Z") },
        { path: "/checkout", timeOnPage: 60, timestamp: new Date("2025-06-01T10:02:00Z") },
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
        { name: "page_view", metadata: { path: "/home" }, category: null, value: null, timestamp: new Date("2025-06-01T10:00:00Z") },
        { name: "button_click", metadata: { button: "cta" }, category: null, value: null, timestamp: new Date("2025-06-01T10:01:00Z") },
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
        { name: "purchase", metadata: { amount: 50 }, category: null, value: null, timestamp: new Date("2025-06-01") },
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

  describe("tracking_record_engagement", () => {
    it("should record engagement data", async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "evt-1" });

      const handler = registry.handlers.get("tracking_record_engagement")!;
      const result = await handler({
        visitor_id: "v-1",
        session_id: "sess-1",
        page: "/home",
        scroll_depth: 75,
        time_ms: 30000,
        sections_viewed: ["hero", "features"],
      });

      const text = getText(result);
      expect(text).toContain("Engagement Recorded");
      expect(text).toContain("v-1");
      expect(text).toContain("/home");
      expect(text).toContain("75%");
      expect(text).toContain("30s");
      expect(text).toContain("Sections: 2");

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          sessionId: "sess-1",
          name: "page_engagement",
          category: "engagement",
          value: 75,
          metadata: {
            visitorId: "v-1",
            page: "/home",
            scrollDepth: 75,
            timeMs: 30000,
            sectionsViewed: ["hero", "features"],
          },
        },
      });
    });

    it("should handle missing sections_viewed", async () => {
      mockPrisma.analyticsEvent.create.mockResolvedValue({ id: "evt-2" });

      const handler = registry.handlers.get("tracking_record_engagement")!;
      const result = await handler({
        visitor_id: "v-2",
        session_id: "sess-2",
        page: "/about",
        scroll_depth: 50,
        time_ms: 5000,
      });

      const text = getText(result);
      expect(text).toContain("Sections: 0");

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              sectionsViewed: [],
            }),
          }),
        }),
      );
    });
  });
});
