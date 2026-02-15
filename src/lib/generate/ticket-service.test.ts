import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateTask = vi.hoisted(() => vi.fn());
const mockUpdateTask = vi.hoisted(() => vi.fn());
const mockCreateIssue = vi.hoisted(() => vi.fn());
const mockBridgeMindInstance = vi.hoisted(() => ({
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
}));

vi.mock("@/lib/sync/clients/bridgemind-client", () => ({
  BridgeMindClient: vi.fn(function () {
    return mockBridgeMindInstance;
  }),
}));

vi.mock("@/lib/agents/github-issues", () => ({
  createIssue: mockCreateIssue,
}));

vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { createGenerationTicket, updateTicketStatus } from "./ticket-service";

describe("ticket-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGenerationTicket", () => {
    it("creates BridgeMind ticket and GitHub issue", async () => {
      mockCreateTask.mockResolvedValue({ data: { id: "bm-123" }, error: null });
      mockCreateIssue.mockResolvedValue({ data: { number: 42 } });

      const result = await createGenerationTicket(
        "cooking/thai-curry",
        "/cooking/thai-curry",
        "food",
      );

      expect(result.bridgemindTaskId).toBe("bm-123");
      expect(result.githubIssueNumber).toBe(42);
    });

    it("falls back to GitHub when BridgeMind fails", async () => {
      mockCreateTask.mockRejectedValue(new Error("BridgeMind down"));
      mockCreateIssue.mockResolvedValue({ data: { number: 42 } });

      const result = await createGenerationTicket("test", "/test", null);

      expect(result.bridgemindTaskId).toBeNull();
      expect(result.githubIssueNumber).toBe(42);
    });

    it("handles both failures gracefully", async () => {
      mockCreateTask.mockRejectedValue(new Error("BridgeMind down"));
      mockCreateIssue.mockRejectedValue(new Error("GitHub down"));

      const result = await createGenerationTicket("test", "/test", null);

      expect(result.bridgemindTaskId).toBeNull();
      expect(result.githubIssueNumber).toBeNull();
    });
  });

  describe("updateTicketStatus", () => {
    it("resolves without error for null ticket IDs", async () => {
      await expect(
        updateTicketStatus(null, null, "CODING"),
      ).resolves.toBeUndefined();
    });

    it("resolves without error for terminal phases", async () => {
      await expect(
        updateTicketStatus(null, 42, "PUBLISHED"),
      ).resolves.toBeUndefined();
    });
  });
});
