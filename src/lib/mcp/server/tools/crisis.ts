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
  crisis_type: z.string().optional().describe("Filter templates by crisis type."),
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
          isResolved: false,
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
        text += `| Crisis ID | Type | Severity | Affected Accounts | Detected |\n`;
        text += `|-----------|------|----------|-------------------|----------|\n`;
        for (const e of events) {
          text += `| \`${e.id}\` | ${e.crisisType} | ${e.severity} | ${e.affectedAccounts ?? 0} | ${e.detectedAt.toISOString()} |\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_get_timeline",
    description: "Get the timeline of a crisis event including related events, response actions, and escalations.",
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
          include: {
            responses: {
              orderBy: { respondedAt: "asc" },
            },
          },
        });

        if (!crisis) {
          return textResult("**Error: NOT_FOUND**\nCrisis event not found.\n**Retryable:** false");
        }

        let text = `**Crisis Timeline**\n\n`;
        text += `**Crisis ID:** \`${crisis.id}\`\n`;
        text += `**Type:** ${crisis.crisisType}\n`;
        text += `**Severity:** ${crisis.severity}\n`;
        text += `**Status:** ${crisis.isResolved ? "Resolved" : "Active"}\n`;
        text += `**Detected:** ${crisis.detectedAt.toISOString()}\n\n`;

        if (crisis.responses && crisis.responses.length > 0) {
          text += `**Response Timeline:**\n\n`;
          text += `| Time | Action | Content |\n`;
          text += `|------|--------|--------|\n`;
          for (const r of crisis.responses) {
            const preview = r.content.slice(0, 80) + (r.content.length > 80 ? "..." : "");
            text += `| ${r.respondedAt.toISOString()} | ${r.action} | ${preview} |\n`;
          }
        } else {
          text += `**Response Timeline:** No responses yet.\n`;
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

        const accountWhere: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.account_ids && args.account_ids.length > 0) {
          accountWhere["id"] = { in: args.account_ids };
        }

        const updateResult = await prisma.socialAccount.updateMany({
          where: accountWhere,
          data: { automationPaused: true },
        });

        const autopilotWhere: Record<string, unknown> = { workspaceId: workspace.id };
        if (args.account_ids && args.account_ids.length > 0) {
          autopilotWhere["socialAccountId"] = { in: args.account_ids };
        }

        await prisma.allocatorAutopilotConfig.updateMany({
          where: autopilotWhere,
          data: { isPaused: true },
        });

        let text = `**Automation Paused**\n\n`;
        text += `**Workspace:** ${workspace.name}\n`;
        text += `**Accounts Paused:** ${updateResult.count}\n`;
        text += `**Scope:** ${args.account_ids && args.account_ids.length > 0 ? "Selected accounts" : "All accounts"}\n`;
        text += `**Reason:** ${args.reason}\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "crisis_get_templates",
    description: "Get crisis response templates with optional crisis type filtering.",
    category: "crisis",
    tier: "free",
    inputSchema: GetTemplatesSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof GetTemplatesSchema>): Promise<CallToolResult> =>
      safeToolCall("crisis_get_templates", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const where: Record<string, unknown> = { isActive: true };
        if (args.crisis_type) where["crisisType"] = args.crisis_type;

        const templates = await prisma.crisisResponseTemplate.findMany({
          where,
        });

        if (templates.length === 0) {
          return textResult("**Crisis Templates**\n\nNo templates found matching the filters.");
        }

        let text = `**Crisis Response Templates** (${templates.length})\n\n`;
        text += `| Template ID | Type | Name | Tone |\n`;
        text += `|------------|------|------|------|\n`;
        for (const t of templates) {
          text += `| \`${t.id}\` | ${t.crisisType} | ${t.name} | ${t.tone} |\n`;
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

        await prisma.crisisResponse.create({
          data: {
            crisisEventId: args.crisis_id,
            content: responseContent,
            action: args.template_id ? "TEMPLATE_RESPONSE" : "CUSTOM_RESPONSE",
            respondedBy: userId,
            respondedAt: new Date(),
          },
        });

        await prisma.crisisDetectionEvent.update({
          where: { id: args.crisis_id },
          data: { status: "RESPONDED" },
        });

        let text = `**Crisis Response Recorded**\n\n`;
        text += `**Crisis ID:** \`${args.crisis_id}\`\n`;
        text += `**Response Type:** ${args.template_id ? "Template" : "Custom"}\n`;
        text += `**Content:** ${responseContent.slice(0, 200)}${responseContent.length > 200 ? "..." : ""}\n`;
        text += `**Status:** RESPONDED\n`;
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
