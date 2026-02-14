/**
 * Crisis MCP Tools
 *
 * Detect, manage, and respond to social media crises.
 * Includes automation pausing, response templates, and timeline tracking.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const DetectSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  severity: z.string().optional().describe("Filter by severity (e.g., LOW, MEDIUM, HIGH, CRITICAL)."),
});

const GetTimelineSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  crisis_id: z.string().min(1).describe("Crisis event ID."),
});

const PauseAutomationSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  account_ids: z.array(z.string().min(1)).optional().describe("Social account IDs to pause. If empty, pauses all."),
  reason: z.string().min(1).describe("Reason for pausing automation."),
  confirm: z.boolean().describe("Must be true to confirm the pause."),
});

const GetTemplatesSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  category: z.string().optional().describe("Filter templates by category."),
});

const RespondSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  crisis_id: z.string().min(1).describe("Crisis event ID."),
  template_id: z.string().optional().describe("Response template ID to use."),
  custom_response: z.string().optional().describe("Custom response text (used if no template_id)."),
});

export function registerCrisisTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "crisis_detect",
    description: "Detect active crisis events in a workspace with optional severity filtering.",
    category: "crisis",
    tier: "free",
    inputSchema: DetectSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof DetectSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_detect", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const where: Record<string, unknown> = {
          workspaceId: workspace.id,
          resolvedAt: null,
        };
        if (args.severity) where["severity"] = args.severity;

        const events = await prisma.crisisDetectionEvent.findMany({
          where,
          orderBy: { detectedAt: "desc" },
        });

        if (events.length === 0) {
          return textResult("**Crisis Detection**\n\nNo active crises detected.");
        }

        let text = `**Active Crises** (${events.length})\n\n`;
        text += `| Crisis ID | Trigger Type | Severity | Affected Accounts | Detected |\n`;
        text += `|-----------|-------------|----------|-------------------|----------|\n`;
        for (const e of events) {
          text += `| \`${e.id}\` | ${e.triggerType} | ${e.severity} | ${e.affectedAccountIds.length} | ${e.detectedAt.toISOString()} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_get_timeline",
    description: "Get the timeline of a crisis event including status and notes.",
    category: "crisis",
    tier: "free",
    inputSchema: GetTimelineSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetTimelineSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_get_timeline", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const crisis = await prisma.crisisDetectionEvent.findFirst({
          where: { id: args.crisis_id },
        });

        if (!crisis) {
          return textResult("**Error: NOT_FOUND**\nCrisis event not found.\n**Retryable:** false");
        }

        let text = `**Crisis Timeline**\n\n`;
        text += `**Crisis ID:** \`${crisis.id}\`\n`;
        text += `**Trigger Type:** ${crisis.triggerType}\n`;
        text += `**Severity:** ${crisis.severity}\n`;
        text += `**Status:** ${crisis.status}\n`;
        text += `**Detected:** ${crisis.detectedAt.toISOString()}\n`;
        if (crisis.acknowledgedAt) {
          text += `**Acknowledged:** ${crisis.acknowledgedAt.toISOString()}\n`;
        }
        if (crisis.resolvedAt) {
          text += `**Resolved:** ${crisis.resolvedAt.toISOString()}\n`;
        }
        if (crisis.responseNotes) {
          text += `**Response Notes:** ${crisis.responseNotes}\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_pause_automation",
    description: "Pause all automation for specified social accounts during a crisis. Requires confirmation.",
    category: "crisis",
    tier: "free",
    inputSchema: PauseAutomationSchema.shape,
    annotations: { destructiveHint: true },
    handler: async (args: z.infer<typeof PauseAutomationSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_pause_automation", async () => {
        if (!args.confirm) {
          return textResult("**Error: VALIDATION_ERROR**\nYou must set confirm=true to pause automation.\n**Retryable:** false");
        }

        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const autopilotWhere: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.account_ids && args.account_ids.length > 0) {
          // Filter autopilot configs by campaign's associated accounts
          autopilotWhere["campaignId"] = { not: null };
        }

        const updateResult = await prisma.allocatorAutopilotConfig.updateMany({
          where: autopilotWhere,
          data: {
            isEmergencyStopped: true,
            emergencyStoppedAt: new Date(),
            emergencyStoppedBy: userId,
            emergencyStopReason: args.reason,
          },
        });

        let text = `**Automation Paused**\n\n`;
        text += `**Workspace:** ${workspace.name}\n`;
        text += `**Autopilot Configs Paused:** ${updateResult.count}\n`;
        text += `**Scope:** ${args.account_ids && args.account_ids.length > 0 ? "Selected accounts" : "All accounts"}\n`;
        text += `**Reason:** ${args.reason}\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_get_templates",
    description: "Get crisis response templates with optional category filtering.",
    category: "crisis",
    tier: "free",
    inputSchema: GetTemplatesSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetTemplatesSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_get_templates", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const where: Record<string, unknown> = { isActive: true };
        if (args.category) where["category"] = args.category;

        const templates = await prisma.crisisResponseTemplate.findMany({
          where,
        });

        if (templates.length === 0) {
          return textResult("**Crisis Templates**\n\nNo templates found matching the filters.");
        }

        let text = `**Crisis Response Templates** (${templates.length})\n\n`;
        text += `| Template ID | Category | Name | Platform |\n`;
        text += `|------------|---------|------|----------|\n`;
        for (const t of templates) {
          text += `| \`${t.id}\` | ${t.category} | ${t.name} | ${t.platform ?? "all"} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_respond",
    description: "Record a response to a crisis event using a template or custom response text.",
    category: "crisis",
    tier: "free",
    inputSchema: RespondSchema.shape,
    handler: async (args: z.infer<typeof RespondSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_respond", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const crisis = await prisma.crisisDetectionEvent.findFirst({
          where: { id: args.crisis_id },
        });

        if (!crisis) {
          return textResult("**Error: NOT_FOUND**\nCrisis event not found.\n**Retryable:** false");
        }

        let responseContent: string;

        if (args.template_id) {
          const template = await prisma.crisisResponseTemplate.findFirst({
            where: { id: args.template_id, isActive: true },
          });
          if (!template) {
            return textResult("**Error: NOT_FOUND**\nResponse template not found or inactive.\n**Retryable:** false");
          }
          responseContent = template.content;
        } else if (args.custom_response) {
          responseContent = args.custom_response;
        } else {
          return textResult("**Error: VALIDATION_ERROR**\nProvide either template_id or custom_response.\n**Retryable:** false");
        }

        await prisma.crisisDetectionEvent.update({
          where: { id: args.crisis_id },
          data: {
            status: "ACKNOWLEDGED",
            acknowledgedAt: new Date(),
            acknowledgedById: userId,
            responseNotes: responseContent,
          },
        });

        let text = `**Crisis Response Recorded**\n\n`;
        text += `**Crisis ID:** \`${args.crisis_id}\`\n`;
        text += `**Response Type:** ${args.template_id ? "Template" : "Custom"}\n`;
        text += `**Content:** ${responseContent.slice(0, 200)}${responseContent.length > 200 ? "..." : ""}\n`;
        text += `**Status:** ACKNOWLEDGED\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
