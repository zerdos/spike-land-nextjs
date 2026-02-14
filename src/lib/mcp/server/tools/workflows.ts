/**
 * Workflows MCP Tools
 *
 * Workflow creation, execution, status tracking, listing, and log retrieval.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import { safeToolCall, textResult, resolveWorkspace } from "./tool-helpers";

const WorkflowCreateSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  name: z.string().min(1).describe("Workflow name."),
  description: z.string().optional().describe("Workflow description."),
  trigger_type: z.string().min(1).describe("Trigger type (e.g. manual, schedule, webhook)."),
  steps: z.string().min(1).describe("JSON array of step definitions."),
});

const WorkflowRunSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  workflow_id: z.string().min(1).describe("Workflow ID to execute."),
  input: z.string().optional().describe("JSON input data for the workflow run."),
});

const WorkflowGetStatusSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  run_id: z.string().min(1).describe("Workflow run ID."),
});

const WorkflowListSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  limit: z.number().optional().default(20).describe("Max workflows to return (default 20)."),
});

const WorkflowGetLogsSchema = z.object({
  workspace_slug: z.string().min(1).describe("Workspace slug."),
  run_id: z.string().min(1).describe("Workflow run ID."),
});

export function registerWorkflowsTools(
  registry: ToolRegistry,
  userId: string,
): void {
  registry.register({
    name: "workflow_create",
    description: "Create a new workflow with steps and a trigger type.",
    category: "workflows",
    tier: "free",
    inputSchema: WorkflowCreateSchema.shape,
    handler: async (args: z.infer<typeof WorkflowCreateSchema>): Promise<CallToolResult> =>
      safeToolCall("workflow_create", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        let parsedSteps: Array<{ name: string; type: string; config?: Record<string, unknown> }>;
        try {
          parsedSteps = JSON.parse(args.steps) as Array<{ name: string; type: string; config?: Record<string, unknown> }>;
        } catch {
          return textResult("**Error: VALIDATION_ERROR**\nInvalid JSON in steps field.\n**Retryable:** false");
        }

        const workflow = await prisma.workflow.create({
          data: {
            workspaceId: workspace.id,
            name: args.name,
            description: args.description ?? null,
            createdById: userId,
          },
        });

        const version = await prisma.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: 1,
          },
        });

        if (parsedSteps.length > 0) {
          await prisma.workflowStep.createMany({
            data: parsedSteps.map((step, index) => ({
              workflowVersionId: version.id,
              name: step.name,
              type: step.type as "TRIGGER" | "ACTION" | "CONDITION",
              config: (step.config ?? {}) as Record<string, string>,
              sequence: index,
            })),
          });
        }

        return textResult(
          `**Workflow Created**\n\n` +
          `**Workflow ID:** ${workflow.id}\n` +
          `**Name:** ${args.name}\n` +
          `**Version:** 1\n` +
          `**Steps:** ${parsedSteps.length}\n` +
          `**Trigger:** ${args.trigger_type}`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "workflow_run",
    description: "Trigger a workflow run with optional input data.",
    category: "workflows",
    tier: "free",
    inputSchema: WorkflowRunSchema.shape,
    handler: async (args: z.infer<typeof WorkflowRunSchema>): Promise<CallToolResult> =>
      safeToolCall("workflow_run", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const workflow = await prisma.workflow.findFirst({
          where: { id: args.workflow_id },
        });

        if (!workflow) {
          return textResult("**Error: NOT_FOUND**\nWorkflow not found.\n**Retryable:** false");
        }

        if (args.input) {
          try {
            JSON.parse(args.input);
          } catch {
            return textResult("**Error: VALIDATION_ERROR**\nInvalid JSON in input field.\n**Retryable:** false");
          }
        }

        const run = await prisma.workflowRun.create({
          data: {
            workflowId: args.workflow_id,
            status: "RUNNING",
          },
        });

        return textResult(
          `**Workflow Run Started**\n\n` +
          `**Run ID:** ${run.id}\n` +
          `**Workflow:** ${workflow.name}\n` +
          `**Status:** RUNNING`,
        );
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "workflow_get_status",
    description: "Get the status of a workflow run including step progress.",
    category: "workflows",
    tier: "free",
    inputSchema: WorkflowGetStatusSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof WorkflowGetStatusSchema>): Promise<CallToolResult> =>
      safeToolCall("workflow_get_status", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const run = await prisma.workflowRun.findFirst({
          where: { id: args.run_id },
          include: {
            workflow: { select: { name: true } },
            logs: {
              orderBy: { timestamp: "asc" },
            },
          },
        });

        if (!run) {
          return textResult("**Error: NOT_FOUND**\nWorkflow run not found.\n**Retryable:** false");
        }

        let text = `**Workflow Run Status**\n\n`;
        text += `**Run ID:** ${run.id}\n`;
        text += `**Workflow:** ${run.workflow.name}\n`;
        text += `**Status:** ${run.status}\n`;
        text += `**Log entries:** ${run.logs.length}\n`;
        text += `**Started:** ${run.startedAt.toISOString()}\n`;
        if (run.endedAt) {
          text += `**Ended:** ${run.endedAt.toISOString()}\n`;
        }

        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "workflow_list",
    description: "List workflows in a workspace with run counts and latest status.",
    category: "workflows",
    tier: "free",
    inputSchema: WorkflowListSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof WorkflowListSchema>): Promise<CallToolResult> =>
      safeToolCall("workflow_list", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        const workspace = await resolveWorkspace(userId, args.workspace_slug);

        const workflows = await prisma.workflow.findMany({
          where: { workspaceId: workspace.id },
          include: {
            _count: { select: { runs: true } },
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { version: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: args.limit ?? 20,
        });

        if (workflows.length === 0) {
          return textResult("No workflows found in this workspace.");
        }

        let text = `**Workflows (${workflows.length}):**\n\n`;
        for (const w of workflows) {
          const latestVersion = w.versions[0]?.version ?? 1;
          text += `- **${w.name}** (v${latestVersion})\n`;
          text += `  Status: ${w.status} | Runs: ${w._count.runs}\n`;
          text += `  Updated: ${w.updatedAt.toISOString()}\n`;
          text += `  ID: ${w.id}\n\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });

  registry.register({
    name: "workflow_get_logs",
    description: "Get execution logs for a workflow run with step-by-step details.",
    category: "workflows",
    tier: "free",
    inputSchema: WorkflowGetLogsSchema.shape,
    annotations: { readOnlyHint: true },
    handler: async (args: z.infer<typeof WorkflowGetLogsSchema>): Promise<CallToolResult> =>
      safeToolCall("workflow_get_logs", async () => {
        const prisma = (await import("@/lib/prisma")).default;
        await resolveWorkspace(userId, args.workspace_slug);

        const run = await prisma.workflowRun.findFirst({
          where: { id: args.run_id },
          include: {
            workflow: { select: { name: true } },
            logs: {
              orderBy: { timestamp: "asc" },
            },
          },
        });

        if (!run) {
          return textResult("**Error: NOT_FOUND**\nWorkflow run not found.\n**Retryable:** false");
        }

        let text = `**Execution Logs: ${run.workflow.name}**\n\n`;
        text += `**Run ID:** ${run.id}\n`;
        text += `**Status:** ${run.status}\n\n`;

        if (run.logs.length === 0) {
          text += "No log entries recorded yet.";
          return textResult(text);
        }

        text += `**Log Entries:**\n\n`;
        for (let i = 0; i < run.logs.length; i++) {
          const log = run.logs[i]!;
          text += `${i + 1}. ${log.message}\n`;
          text += `   Step: ${log.stepId ?? "N/A"} | Status: ${log.stepStatus ?? "N/A"}\n`;
          text += `   Time: ${log.timestamp.toISOString()}\n`;
          if (log.metadata) text += `   Metadata: ${JSON.stringify(log.metadata)}\n`;
          text += `\n`;
        }
        return textResult(text);
      }, { timeoutMs: 30_000 }),
  });
}
