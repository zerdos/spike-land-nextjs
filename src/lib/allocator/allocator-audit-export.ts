import type { AllocatorAuditLog } from "@prisma/client";
import { allocatorAuditLogger, type AllocatorAuditSearchOptions } from "./allocator-audit-logger";

export type AllocatorExportFormat = "csv" | "json";

export interface AllocatorAuditExportResult {
  format: AllocatorExportFormat;
  filename: string;
  data: string;
  mimeType: string;
  recordCount: number;
}

export class AllocatorAuditExportService {
  /**
   * Export allocator audit logs in the specified format
   */
  static async export(
    options: AllocatorAuditSearchOptions & { format: AllocatorExportFormat; },
  ): Promise<AllocatorAuditExportResult> {
    // Always fetch all matching logs for export (up to a reasonable limit? 1000?)
    // Default limit in search is 50. We want more for export.
    const searchOptions = {
      ...options,
      limit: options.limit || 1000, // Default to 1000 for export if not specified
    };

    const { logs } = await allocatorAuditLogger.search(searchOptions);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseFilename = `allocator-audit-${timestamp}`;

    switch (options.format) {
      case "csv":
        return this.exportToCsv(logs, baseFilename);
      case "json":
        return this.exportToJson(logs, baseFilename);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export logs to CSV format
   */
  private static exportToCsv(
    logs: AllocatorAuditLog[],
    filename: string,
  ): AllocatorAuditExportResult {
    const headers = [
      "Timestamp",
      "Decision Type",
      "Outcome",
      "Campaign ID",
      "AI Reasoning",
      "Confidence",
      "Correlation ID",
    ];

    // CSV Escaping Helper
    const escapeField = (field: unknown): string => {
      if (field === null || field === undefined) return "";
      const str = typeof field === "object" ? JSON.stringify(field) : String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.join(",")];

    for (const log of logs) {
      const row = [
        escapeField(log.createdAt.toISOString()),
        escapeField(log.decisionType),
        escapeField(log.decisionOutcome),
        escapeField(log.campaignId),
        escapeField(log.aiReasoning),
        escapeField(log.confidence),
        escapeField(log.correlationId),
      ];
      rows.push(row.join(","));
    }

    return {
      format: "csv",
      filename: `${filename}.csv`,
      data: rows.join("\n"),
      mimeType: "text/csv",
      recordCount: logs.length,
    };
  }

  /**
   * Export logs to JSON format
   */
  private static exportToJson(
    logs: AllocatorAuditLog[],
    filename: string,
  ): AllocatorAuditExportResult {
    return {
      format: "json",
      filename: `${filename}.json`,
      data: JSON.stringify(logs, null, 2),
      mimeType: "application/json",
      recordCount: logs.length,
    };
  }
}
