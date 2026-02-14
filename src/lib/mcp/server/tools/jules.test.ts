import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { createMockRegistry, getText } from "../__test-utils__";
import { registerJulesTools, isJulesAvailable } from "./jules";

function mockJsonResponse(data: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(data) };
}

describe("jules tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JULES_API_KEY = "test-api-key";
    registry = createMockRegistry();
    registerJulesTools(registry, userId);
  });

  afterEach(() => {
    delete process.env.JULES_API_KEY;
  });

  it("isJulesAvailable returns true when key set", () => {
    expect(isJulesAvailable()).toBe(true);
  });

  it("should register 5 jules tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("jules_list_sessions")).toBe(true);
    expect(registry.handlers.has("jules_create_session")).toBe(true);
    expect(registry.handlers.has("jules_get_session")).toBe(true);
    expect(registry.handlers.has("jules_approve_plan")).toBe(true);
    expect(registry.handlers.has("jules_send_message")).toBe(true);
  });

  it("should not register when API key missing", () => {
    delete process.env.JULES_API_KEY;
    const reg2 = createMockRegistry();
    registerJulesTools(reg2, userId);
    expect(reg2.register).toHaveBeenCalledTimes(0);
  });

  describe("jules_list_sessions", () => {
    it("should list sessions", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({
        sessions: [{ name: "sessions/abc", state: "COMPLETED", title: "Fix bug" }],
      }));
      const handler = registry.handlers.get("jules_list_sessions")!;
      const result = await handler({ page_size: 20 });
      expect(getText(result)).toContain("Fix bug");
      expect(getText(result)).toContain("COMPLETED");
    });

    it("should show empty message", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ sessions: [] }));
      const handler = registry.handlers.get("jules_list_sessions")!;
      const result = await handler({ page_size: 20 });
      expect(getText(result)).toContain("No sessions found");
    });
  });

  describe("jules_create_session", () => {
    it("should create session", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ name: "sessions/new-123", state: "QUEUED" }));
      const handler = registry.handlers.get("jules_create_session")!;
      const result = await handler({ title: "New task", task: "Fix the login bug", starting_branch: "main" });
      expect(getText(result)).toContain("Jules Session Created");
      expect(getText(result)).toContain("QUEUED");
    });

    it("should handle API error", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ error: { message: "Rate limited" } }, false));
      const handler = registry.handlers.get("jules_create_session")!;
      const result = await handler({ title: "Task", task: "Do something", starting_branch: "main" });
      expect(getText(result)).toContain("Error");
    });
  });

  describe("jules_get_session", () => {
    it("should get session with activities", async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ name: "sessions/abc", state: "COMPLETED", title: "Fix bug", planSummary: "Updated auth" }))
        .mockResolvedValueOnce(mockJsonResponse({ activities: [{ type: "code_change", content: "Modified auth.ts" }] }));
      const handler = registry.handlers.get("jules_get_session")!;
      const result = await handler({ session_id: "abc", include_activities: true });
      expect(getText(result)).toContain("Fix bug");
      expect(getText(result)).toContain("Updated auth");
      expect(getText(result)).toContain("Modified auth.ts");
    });
  });

  describe("jules_approve_plan", () => {
    it("should approve plan", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ state: "IN_PROGRESS" }));
      const handler = registry.handlers.get("jules_approve_plan")!;
      const result = await handler({ session_id: "abc" });
      expect(getText(result)).toContain("Plan Approved");
    });
  });

  describe("jules_send_message", () => {
    it("should send message", async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ state: "IN_PROGRESS" }));
      const handler = registry.handlers.get("jules_send_message")!;
      const result = await handler({ session_id: "abc", message: "Please also fix tests" });
      expect(getText(result)).toContain("Message Sent");
    });
  });
});
