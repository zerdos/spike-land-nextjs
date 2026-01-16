import type { AllocatorAuditLog } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllocatorAuditExportService } from "./allocator-audit-export";
import { allocatorAuditLogger } from "./allocator-audit-logger";

vi.mock("./allocator-audit-logger", () => ({
  allocatorAuditLogger: {
    search: vi.fn(),
  },
}));

describe("AllocatorAuditExportService", () => {
  const mockLogs = [
    {
      id: "1",
      workspaceId: "ws-1",
      createdAt: new Date("2024-01-01T12:00:00Z"),
      decisionType: "RECOMMENDATION_GENERATED",
      decisionOutcome: "EXECUTED",
      campaignId: "camp-1",
      aiReasoning: "Good performance",
      confidence: "high",
      correlationId: "corr-1",
    } as AllocatorAuditLog,
    {
      id: "2",
      workspaceId: "ws-1",
      createdAt: new Date("2024-01-02T12:00:00Z"),
      decisionType: "EXECUTION_FAILED",
      decisionOutcome: "FAILED",
      campaignId: "camp-1",
      aiReasoning: "Error occurred",
      confidence: null,
      correlationId: "corr-2",
    } as AllocatorAuditLog,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("export", () => {
    it("exports to CSV correctly", async () => {
      vi.mocked(allocatorAuditLogger.search).mockResolvedValue({
        logs: mockLogs,
        total: 2,
      });

      const result = await AllocatorAuditExportService.export({
        workspaceId: "ws-1",
        format: "csv",
      });

      expect(result.format).toBe("csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.recordCount).toBe(2);
      expect(result.filename).toContain(".csv");

      const lines = result.data.split("\n");
      expect(lines.length).toBe(3); // Header + 2 rows
      expect(lines[0]).toContain("Timestamp,Decision Type");
      expect(lines[1]).toContain("2024-01-01T12:00:00.000Z");
      expect(lines[1]).toContain("RECOMMENDATION_GENERATED");
      expect(lines[2]).toContain("EXECUTION_FAILED");
    });

    it("exports to JSON correctly", async () => {
      vi.mocked(allocatorAuditLogger.search).mockResolvedValue({
        logs: mockLogs,
        total: 2,
      });

      const result = await AllocatorAuditExportService.export({
        workspaceId: "ws-1",
        format: "json",
      });

      expect(result.format).toBe("json");
      expect(result.mimeType).toBe("application/json");
      expect(result.recordCount).toBe(2);
      expect(result.filename).toContain(".json");

      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("1");
    });

    it("throws error for unsupported format", async () => {
      vi.mocked(allocatorAuditLogger.search).mockResolvedValue({
        logs: [],
        total: 0,
      });

      await expect(
        AllocatorAuditExportService.export({
          workspaceId: "ws-1",
          format: "xml" as any,
        }),
      ).rejects.toThrow("Unsupported export format");
    });

    it("handles special characters in CSV", async () => {
      const complexLog = [
        {
          ...mockLogs[0],
          aiReasoning: 'Reason with "quotes" and, commas',
        } as AllocatorAuditLog,
      ];
      vi.mocked(allocatorAuditLogger.search).mockResolvedValue({
        logs: complexLog,
        total: 1,
      });

      const result = await AllocatorAuditExportService.export({
        workspaceId: "ws-1",
        format: "csv",
      });

      expect(result.data).toContain('"Reason with ""quotes"" and, commas"');
    });
  });
});
