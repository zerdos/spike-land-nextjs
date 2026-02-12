/**
 * Gateway MCP Tools (Server-Side)
 *
 * BridgeMind project management, GitHub Projects sync, and Bolt orchestration.
 * Uses existing server-side clients directly instead of HTTP.
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolRegistry } from "../tool-registry";
import {
  getBridgeMindClient,
  isBridgeMindAvailable,
} from "@/lib/sync/clients/bridgemind-client";
import { isGitHubProjectsAvailable } from "@/lib/sync/clients/github-projects-client";
import {
  createBridgeMindClient,
  createGitHubProjectsClient,
} from "@/lib/sync/create-sync-clients";
import { syncBridgeMindToGitHub } from "@/lib/sync/bridgemind-github-sync";
import prisma from "@/lib/prisma";

// ========================================
// Availability
// ========================================

export function isGatewayAvailable(): boolean {
  return isBridgeMindAvailable() || isGitHubProjectsAvailable();
}

// ========================================
// Bolt State
// ========================================

let boltPaused = false;

export function isBoltPaused(): boolean {
  return boltPaused;
}

/** @internal — exposed for testing */
export function resetBoltState(): void {
  boltPaused = false;
}

// ========================================
// Schemas
// ========================================

const BridgeMindListTasksSchema = z.object({
  status: z.string().optional().describe("Filter by task status"),
  sprint_id: z.string().optional().describe("Filter by sprint ID"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Max items to return"),
});

const BridgeMindCreateTaskSchema = z.object({
  title: z.string().min(1).max(200).describe("Task title"),
  description: z
    .string()
    .min(1)
    .max(4000)
    .describe("Task description"),
  priority: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium")
    .describe("Task priority"),
  labels: z.array(z.string()).optional().describe("Task labels"),
  sprint_id: z.string().optional().describe("Sprint to add task to"),
});

const BridgeMindUpdateTaskSchema = z.object({
  task_id: z.string().min(1).describe("Task ID to update"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  status: z.string().optional().describe("New status"),
  priority: z.string().optional().describe("New priority"),
  labels: z.array(z.string()).optional().describe("New labels"),
});

const BridgeMindGetKnowledgeSchema = z.object({
  query: z.string().min(1).describe("Search query for knowledge base"),
});

const BridgeMindAddKnowledgeSchema = z.object({
  title: z.string().min(1).max(200).describe("Knowledge entry title"),
  content: z.string().min(1).describe("Knowledge content"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
});

const GitHubListIssuesSchema = z.object({
  status: z
    .string()
    .optional()
    .describe("Filter by project item status"),
  first: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Number of items to return"),
});

const GitHubCreateIssueSchema = z.object({
  title: z.string().min(1).max(200).describe("Issue title"),
  body: z.string().min(1).describe("Issue body in markdown"),
  labels: z.array(z.string()).optional().describe("Labels to apply"),
});

const GitHubUpdateProjectItemSchema = z.object({
  item_id: z.string().min(1).describe("Project item ID"),
  field_id: z.string().min(1).describe("Field ID to update"),
  value: z.string().min(1).describe("New value for the field"),
});

const GitHubGetPRStatusSchema = z.object({
  issue_number: z.number().min(1).describe("GitHub issue number"),
});

const SyncTriggerSchema = z.object({
  dry_run: z
    .boolean()
    .optional()
    .default(false)
    .describe("Preview changes without applying"),
});

// ========================================
// Helpers
// ========================================

function ok(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

// ========================================
// Registration
// ========================================

export function registerGatewayTools(
  registry: ToolRegistry,
  _userId: string,
): void {
  // ---- BridgeMind tools (6) ----
  if (isBridgeMindAvailable()) {
    registry.register({
      name: "bridgemind_list_tasks",
      description:
        "List tasks from the BridgeMind project board. Filter by status or sprint.",
      category: "gateway",
      tier: "workspace",
      inputSchema: BridgeMindListTasksSchema.shape,
      handler: async ({ status, sprint_id, limit }) => {
        const params = BridgeMindListTasksSchema.parse({
          status,
          sprint_id,
          limit,
        });
        const client = getBridgeMindClient();
        const result = await client.listTasks({
          status: params.status,
          sprintId: params.sprint_id,
          limit: params.limit,
        });

        if (result.error) return err(`Error: ${result.error}`);

        const tasks = result.data ?? [];
        let text = `**BridgeMind Tasks (${tasks.length}):**\n\n`;
        for (const task of tasks) {
          text += `- **${task.title}** [${task.status}] (${task.priority})\n`;
          text += `  ID: ${task.id}\n`;
          if (task.labels?.length)
            text += `  Labels: ${task.labels.join(", ")}\n`;
          text += "\n";
        }
        return ok(text);
      },
    });

    registry.register({
      name: "bridgemind_create_task",
      description: "Create a new task on the BridgeMind project board.",
      category: "gateway",
      tier: "workspace",
      inputSchema: BridgeMindCreateTaskSchema.shape,
      handler: async ({ title, description, priority, labels, sprint_id }) => {
        const params = BridgeMindCreateTaskSchema.parse({
          title,
          description,
          priority,
          labels,
          sprint_id,
        });
        const client = getBridgeMindClient();
        const result = await client.createTask({
          title: params.title,
          description: params.description,
          priority: params.priority,
          labels: params.labels,
          sprintId: params.sprint_id,
        });

        if (result.error) return err(`Error: ${result.error}`);

        return ok(
          `**Task Created!**\n\n**ID:** ${result.data?.id}\n**Title:** ${result.data?.title}\n**Status:** ${result.data?.status}`,
        );
      },
    });

    registry.register({
      name: "bridgemind_update_task",
      description: "Update an existing task on the BridgeMind board.",
      category: "gateway",
      tier: "workspace",
      inputSchema: BridgeMindUpdateTaskSchema.shape,
      handler: async ({
        task_id,
        title,
        description,
        status,
        priority,
        labels,
      }) => {
        const params = BridgeMindUpdateTaskSchema.parse({
          task_id,
          title,
          description,
          status,
          priority,
          labels,
        });
        const { task_id: id, ...updates } = params;
        const client = getBridgeMindClient();
        const result = await client.updateTask(id, updates);

        if (result.error) return err(`Error: ${result.error}`);

        return ok(
          `**Task Updated!**\n\n**ID:** ${result.data?.id}\n**Status:** ${result.data?.status}`,
        );
      },
    });

    registry.register({
      name: "bridgemind_get_knowledge",
      description:
        "Search the BridgeMind knowledge base for relevant information.",
      category: "gateway",
      tier: "workspace",
      inputSchema: BridgeMindGetKnowledgeSchema.shape,
      handler: async ({ query }) => {
        const params = BridgeMindGetKnowledgeSchema.parse({ query });
        const client = getBridgeMindClient();
        const result = await client.getKnowledge(params.query);

        if (result.error) return err(`Error: ${result.error}`);

        const entries = result.data ?? [];
        let text = `**Knowledge Results (${entries.length}):**\n\n`;
        for (const entry of entries) {
          text += `### ${entry.title}\n${entry.content}\n\nTags: ${entry.tags.join(", ")}\n\n---\n\n`;
        }
        return ok(text);
      },
    });

    registry.register({
      name: "bridgemind_add_knowledge",
      description: "Add a new entry to the BridgeMind knowledge base.",
      category: "gateway",
      tier: "workspace",
      inputSchema: BridgeMindAddKnowledgeSchema.shape,
      handler: async ({ title, content, tags }) => {
        const params = BridgeMindAddKnowledgeSchema.parse({
          title,
          content,
          tags,
        });
        const client = getBridgeMindClient();
        const result = await client.addKnowledge({
          title: params.title,
          content: params.content,
          tags: params.tags,
        });

        if (result.error) return err(`Error: ${result.error}`);

        return ok(
          `**Knowledge Added!**\n\n**ID:** ${result.data?.id}\n**Title:** ${result.data?.title}`,
        );
      },
    });

    registry.register({
      name: "bridgemind_list_sprints",
      description: "List all sprints from BridgeMind.",
      category: "gateway",
      tier: "workspace",
      inputSchema: {},
      handler: async () => {
        const client = getBridgeMindClient();
        const result = await client.listSprints();

        if (result.error) return err(`Error: ${result.error}`);

        const sprints = result.data ?? [];
        let text = `**Sprints (${sprints.length}):**\n\n`;
        for (const sprint of sprints) {
          text += `- **${sprint.name}** [${sprint.status}]\n`;
          text += `  ${sprint.startDate} → ${sprint.endDate}\n`;
          if (sprint.goals?.length)
            text += `  Goals: ${sprint.goals.join(", ")}\n`;
          text += "\n";
        }
        return ok(text);
      },
    });
  }

  // ---- GitHub Projects tools (4) ----
  if (isGitHubProjectsAvailable()) {
    registry.register({
      name: "github_list_issues",
      description:
        "List issues from GitHub Projects V2 (read-only mirror of BridgeMind board).",
      category: "gateway",
      tier: "workspace",
      inputSchema: GitHubListIssuesSchema.shape,
      handler: async ({ first }) => {
        const params = GitHubListIssuesSchema.parse({ first });
        const client = createGitHubProjectsClient();
        const result = await client.listItems({ first: params.first });

        if (result.error) return err(`Error: ${result.error}`);

        const items = result.data?.items ?? [];
        let text = `**GitHub Project Items (${items.length}):**\n\n`;
        for (const item of items) {
          text += `- **${item.title}** [${item.status}]`;
          if (item.issueNumber) text += ` #${item.issueNumber}`;
          text += "\n";
          if (item.labels.length)
            text += `  Labels: ${item.labels.join(", ")}\n`;
          text += "\n";
        }
        return ok(text);
      },
    });

    registry.register({
      name: "github_create_issue",
      description:
        "Create a new GitHub issue (for mirroring BridgeMind tasks).",
      category: "gateway",
      tier: "workspace",
      inputSchema: GitHubCreateIssueSchema.shape,
      handler: async ({ title, body, labels }) => {
        const params = GitHubCreateIssueSchema.parse({ title, body, labels });
        const client = createGitHubProjectsClient();
        const result = await client.createIssue({
          title: params.title,
          body: params.body,
          labels: params.labels,
        });

        if (result.error) return err(`Error: ${result.error}`);

        return ok(
          `**Issue Created!**\n\n**Number:** #${result.data?.number}\n**URL:** ${result.data?.url}`,
        );
      },
    });

    registry.register({
      name: "github_update_project_item",
      description: "Update a field value on a GitHub Projects V2 item.",
      category: "gateway",
      tier: "workspace",
      inputSchema: GitHubUpdateProjectItemSchema.shape,
      handler: async ({ item_id, field_id, value }) => {
        const params = GitHubUpdateProjectItemSchema.parse({
          item_id,
          field_id,
          value,
        });
        const client = createGitHubProjectsClient();
        const result = await client.updateItemField(
          params.item_id,
          params.field_id,
          { text: params.value },
        );

        if (result.error) return err(`Error: ${result.error}`);

        return ok("**Project item updated successfully!**");
      },
    });

    registry.register({
      name: "github_get_pr_status",
      description: "Get PR and CI status for a GitHub issue.",
      category: "gateway",
      tier: "workspace",
      inputSchema: GitHubGetPRStatusSchema.shape,
      handler: async ({ issue_number }) => {
        const params = GitHubGetPRStatusSchema.parse({ issue_number });
        const client = createGitHubProjectsClient();
        const result = await client.getPRStatus(params.issue_number);

        if (result.error) return err(`Error: ${result.error}`);

        const pr = result.data;
        let text = `**PR Status for Issue #${params.issue_number}:**\n\n`;
        if (!pr?.prNumber) {
          text += "No linked PR found.";
        } else {
          text += `**PR:** #${pr.prNumber}\n`;
          text += `**State:** ${pr.prState}\n`;
          text += `**CI:** ${pr.ciStatus ?? "unknown"}\n`;
          text += `**Review:** ${pr.reviewDecision ?? "none"}\n`;
          if (pr.mergedAt) text += `**Merged:** ${pr.mergedAt}\n`;
        }
        return ok(text);
      },
    });
  }

  // ---- Sync tools (2) ----
  if (isBridgeMindAvailable() && isGitHubProjectsAvailable()) {
    registry.register({
      name: "sync_bridgemind_to_github",
      description:
        "Sync BridgeMind board items to GitHub Projects V2 (one-way: BridgeMind → GitHub).",
      category: "gateway",
      tier: "workspace",
      inputSchema: SyncTriggerSchema.shape,
      handler: async ({ dry_run }) => {
        const params = SyncTriggerSchema.parse({ dry_run });

        if (params.dry_run) {
          // Lightweight dry-run: title-match preview, no DB writes
          const bmClient = createBridgeMindClient();
          const ghClient = createGitHubProjectsClient();

          const bmResult = await bmClient.listTasks({ limit: 100 });
          if (bmResult.error)
            return err(`BridgeMind error: ${bmResult.error}`);

          const ghResult = await ghClient.listAllItems();

          const bmTasks = bmResult.data ?? [];
          const ghItems = ghResult.data ?? [];

          const existingTitles = new Set(ghItems.map((i) => i.title));
          const newTasks = bmTasks.filter(
            (t) => !existingTitles.has(t.title),
          );

          let text = `**Sync Preview (Dry Run):**\n\n`;
          text += `BridgeMind tasks: ${bmTasks.length}\n`;
          text += `GitHub items: ${ghItems.length}\n`;
          text += `New tasks to sync: ${newTasks.length}\n\n`;
          for (const task of newTasks) {
            text += `- **${task.title}** [${task.status}]\n`;
          }
          return ok(text);
        }

        // Production sync via Prisma-backed sync engine
        const syncResult = await syncBridgeMindToGitHub({
          bridgemind: createBridgeMindClient(),
          github: createGitHubProjectsClient(),
        });

        let text = `**Sync Complete!**\n\n`;
        text += `Created: ${syncResult.created} issues\n`;
        text += `Updated: ${syncResult.updated}\n`;
        text += `Skipped: ${syncResult.skipped}\n`;
        text += `Duration: ${syncResult.durationMs}ms\n`;
        if (syncResult.errors.length > 0) {
          text += `Errors: ${syncResult.errors.length}\n`;
          text += syncResult.errors.map((e) => `  - ${e}`).join("\n");
        }

        return syncResult.success ? ok(text) : err(text);
      },
    });

    registry.register({
      name: "sync_status",
      description:
        "Get the current sync status between BridgeMind and GitHub.",
      category: "gateway",
      tier: "workspace",
      inputSchema: {},
      handler: async () => {
        const parts: string[] = [];

        // BridgeMind circuit breaker state
        const bmClient = getBridgeMindClient();
        const cbState = bmClient.getCircuitBreakerState();
        parts.push(
          `**BridgeMind:** ${cbState.status === "closed" ? "healthy" : cbState.status}` +
            (cbState.failures > 0 ? ` (${cbState.failures} failures)` : ""),
        );

        // GitHub availability
        const ghClient = createGitHubProjectsClient();
        const rateLimit = ghClient.getRateLimitInfo();
        parts.push(
          `**GitHub:** configured` +
            (rateLimit
              ? ` (${rateLimit.remaining} API calls remaining)`
              : ""),
        );

        // Last sync from DB (graceful degradation)
        try {
          const syncState = await prisma.syncState.findFirst({
            where: { source: "BRIDGEMIND" },
          });
          if (syncState) {
            parts.push(
              `**Last Sync:** ${syncState.lastSuccessfulSync?.toISOString() ?? "never"}`,
            );
            parts.push(`**Items Synced:** ${syncState.itemsSynced ?? 0}`);
            if (syncState.errorMessage) {
              parts.push(`**Last Error:** ${syncState.errorMessage}`);
            }
          }
        } catch {
          parts.push("**Last Sync:** (database unavailable)");
        }

        return ok(`**Sync Status:**\n\n${parts.join("\n")}`);
      },
    });
  }

  // ---- Bolt tools (3, always registered) ----
  registry.register({
    name: "bolt_status",
    description:
      "Get the current Bolt orchestrator status, including active tasks and health.",
    category: "gateway",
    tier: "workspace",
    inputSchema: {},
    handler: async () => {
      const services: string[] = [];
      services.push(
        `**Orchestrator:** ${boltPaused ? "PAUSED" : "RUNNING"}`,
      );

      if (isBridgeMindAvailable()) {
        const bm = getBridgeMindClient();
        services.push(
          `**BridgeMind:** ${bm.getCircuitBreakerState().status}`,
        );
      } else {
        services.push("**BridgeMind:** not configured");
      }

      if (isGitHubProjectsAvailable()) {
        services.push("**GitHub Projects:** configured");
      } else {
        services.push("**GitHub Projects:** not configured");
      }

      return ok(
        `**Bolt Status:**\n\n${services.join("\n")}\n\nUse \`/bolt sync\`, \`/bolt plan\`, \`/bolt check\`, or \`/bolt merge\` for operations.`,
      );
    },
  });

  registry.register({
    name: "bolt_pause",
    description:
      "Pause the Bolt orchestrator. Active tasks continue but no new ones are started.",
    category: "gateway",
    tier: "workspace",
    inputSchema: {},
    handler: async () => {
      boltPaused = true;
      return ok(
        "**Bolt paused.** Active tasks continue but no new tasks will be started.",
      );
    },
  });

  registry.register({
    name: "bolt_resume",
    description: "Resume the Bolt orchestrator after a pause.",
    category: "gateway",
    tier: "workspace",
    inputSchema: {},
    handler: async () => {
      boltPaused = false;
      return ok("**Bolt resumed.** New tasks will be started again.");
    },
  });
}
