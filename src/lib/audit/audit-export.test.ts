/**
 * Audit Export Service Tests
 *
 * Unit tests for audit log export functionality.
 * Resolves #590: Build comprehensive Audit Log
 */

import { AuditAction } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock WorkspaceAuditLogger
vi.mock("./workspace-audit-logger", () => ({
  WorkspaceAuditLogger: {
    getAllForExport: vi.fn(),
  },
}));

import { AuditExportService } from "./audit-export";
import { WorkspaceAuditLogger } from "./workspace-audit-logger";

const mockGetAllForExport = vi.mocked(WorkspaceAuditLogger.getAllForExport);

describe("AuditExportService", () => {
  const mockLogs = [
    {
      id: "log-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      action: AuditAction.ADMIN_LOGIN,
      targetId: null,
      targetType: null,
      resourceId: null,
      resourceType: null,
      oldValue: null,
      newValue: null,
      metadata: { browser: "Chrome" },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2024-01-15T10:00:00Z"),
    },
    {
      id: "log-2",
      workspaceId: "workspace-1",
      userId: "user-2",
      action: AuditAction.ROLE_CHANGE,
      targetId: "user-3",
      targetType: "user",
      resourceId: null,
      resourceType: null,
      oldValue: { role: "USER" },
      newValue: { role: "ADMIN" },
      metadata: null,
      ipAddress: "10.0.0.1",
      userAgent: null,
      createdAt: new Date("2024-01-15T11:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("export", () => {
    it("should export to CSV format", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: { workspaceId: "workspace-1" },
        includeMetadata: false,
      });

      expect(result.format).toBe("csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.filename).toMatch(/^audit-logs-.*\.csv$/);
      expect(result.recordCount).toBe(2);
      expect(typeof result.data).toBe("string");
      expect(result.data).toContain("ID,Workspace ID");
    });

    it("should export to JSON format", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "json",
        searchParams: { workspaceId: "workspace-1" },
        includeMetadata: true,
      });

      expect(result.format).toBe("json");
      expect(result.mimeType).toBe("application/json");
      expect(result.filename).toMatch(/^audit-logs-.*\.json$/);
      expect(result.recordCount).toBe(2);

      const parsed = JSON.parse(result.data as string);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.recordCount).toBe(2);
      expect(parsed.logs).toHaveLength(2);
    });

    it("should export to PDF format (returns HTML for client-side conversion)", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "pdf",
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(result.format).toBe("pdf");
      expect(result.mimeType).toBe("text/html");
      expect(result.filename).toMatch(/^audit-logs-.*\.html$/);
      expect(result.recordCount).toBe(2);
      // PDF format returns HTML that can be converted to PDF client-side
      expect(typeof result.data).toBe("string");
      expect(result.data).toContain("<!DOCTYPE html>");
      expect(result.data).toContain("Audit Log Export");
    });

    it("should use custom filename if provided", async () => {
      mockGetAllForExport.mockResolvedValue([]);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: {},
        filename: "custom-export",
      });

      expect(result.filename).toBe("custom-export.csv");
    });

    it("should include metadata in CSV when requested", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: {},
        includeMetadata: true,
      });

      expect(result.data).toContain("Old Value,New Value,Metadata");
    });

    it("should handle empty log list", async () => {
      mockGetAllForExport.mockResolvedValue([]);

      const result = await AuditExportService.export({
        format: "json",
        searchParams: {},
      });

      expect(result.recordCount).toBe(0);
      const parsed = JSON.parse(result.data as string);
      expect(parsed.logs).toHaveLength(0);
    });

    it("should throw error for unsupported format", async () => {
      mockGetAllForExport.mockResolvedValue([]);

      await expect(
        AuditExportService.export({
          format: "xml" as never,
          searchParams: {},
        }),
      ).rejects.toThrow("Unsupported export format: xml");
    });
  });

  describe("validateOptions", () => {
    it("should return empty array for valid options", () => {
      const errors = AuditExportService.validateOptions({
        format: "csv",
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(errors).toHaveLength(0);
    });

    it("should return error for invalid format", () => {
      const errors = AuditExportService.validateOptions({
        format: "xml" as never,
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(errors).toContain("Unsupported export format: xml");
    });

    it("should return error for missing workspaceId", () => {
      const errors = AuditExportService.validateOptions({
        format: "csv",
        searchParams: {},
      });

      expect(errors).toContain("Workspace ID is required for export");
    });

    it("should return error for missing format", () => {
      const errors = AuditExportService.validateOptions({
        format: "" as never,
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(errors).toContain("Export format is required");
    });
  });

  describe("CSV escaping", () => {
    it("should escape fields with commas", async () => {
      const logsWithCommas = [
        {
          ...mockLogs[0]!,
          userAgent: "Mozilla/5.0, Safari",
        },
      ];
      mockGetAllForExport.mockResolvedValue(logsWithCommas);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(result.data).toContain('"Mozilla/5.0, Safari"');
    });

    it("should escape fields with quotes", async () => {
      const logsWithQuotes = [
        {
          ...mockLogs[0]!,
          userAgent: 'Test "Browser"',
        },
      ];
      mockGetAllForExport.mockResolvedValue(logsWithQuotes);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: { workspaceId: "workspace-1" },
      });

      expect(result.data).toContain('"Test ""Browser"""');
    });

    it("should handle null values in CSV", async () => {
      const logsWithNulls = [
        {
          ...mockLogs[0]!,
          targetId: null,
          targetType: null,
          ipAddress: null,
        },
      ];
      mockGetAllForExport.mockResolvedValue(logsWithNulls);

      const result = await AuditExportService.export({
        format: "csv",
        searchParams: { workspaceId: "workspace-1" },
      });

      // Should contain empty fields for nulls
      expect(typeof result.data).toBe("string");
    });
  });

  describe("JSON export structure", () => {
    it("should include export metadata in JSON", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "json",
        searchParams: { workspaceId: "workspace-1" },
      });

      const parsed = JSON.parse(result.data as string);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.recordCount).toBe(2);
      expect(parsed.logs).toHaveLength(2);
    });

    it("should preserve metadata fields in JSON export", async () => {
      mockGetAllForExport.mockResolvedValue(mockLogs);

      const result = await AuditExportService.export({
        format: "json",
        searchParams: { workspaceId: "workspace-1" },
        includeMetadata: true,
      });

      const parsed = JSON.parse(result.data as string);
      expect(parsed.logs[0].metadata).toEqual({ browser: "Chrome" });
    });
  });
});
