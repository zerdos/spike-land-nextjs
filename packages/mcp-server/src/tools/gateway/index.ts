/**
 * Gateway MCP Tools
 *
 * Tools for BridgeMind proxy, GitHub Projects management,
 * sync operations, and Bolt management.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { BridgeMindClient, isBridgeMindAvailable } from "../../clients/bridgemind-client.js";
import { GitHubProjectsClient, isGitHubProjectsAvailable } from "../../clients/github-projects-client.js";

// ========================================
// Availability Checks
// ========================================

export function isGatewayAvailable(): boolean {
  return isBridgeMindAvailable() || isGitHubProjectsAvailable();
}

// ========================================
// Schemas
// ========================================

const BridgeMindListTasksSchema = z.object({
  status: z.string().optional().describe("Filter by task status"),
  sprint_id: z.string().optional().describe("Filter by sprint ID"),
  limit: z.number().min(1).max(100).optional().default(50).describe("Max items to return"),
});

const BridgeMindCreateTaskSchema = z.object({
  title: z.string().min(1).max(200).describe("Task title"),
  description: z.string().min(1).max(4000).describe("Task description"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium").describe("Task priority"),
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
  status: z.string().optional().describe("Filter by project item status"),
  first: z.number().min(1).max(100).optional().default(50).describe("Number of items to return"),
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
  dry_run: z.boolean().optional().default(false).describe("Preview changes without applying"),
});

// ========================================
// Tool Definitions
// ========================================

export function getGatewayTools(): Tool[] {
  const tools: Tool[] = [];

  // BridgeMind proxied tools
  if (isBridgeMindAvailable()) {
    tools.push(
      {
        name: "bridgemind_list_tasks",
        description: "List tasks from the BridgeMind project board. Filter by status or sprint.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", description: "Filter by task status" },
            sprint_id: { type: "string", description: "Filter by sprint ID" },
            limit: { type: "number", default: 50, description: "Max items (1-100)" },
          },
        },
      },
      {
        name: "bridgemind_create_task",
        description: "Create a new task on the BridgeMind project board.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Detailed description" },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"], default: "medium" },
            labels: { type: "array", items: { type: "string" }, description: "Labels" },
            sprint_id: { type: "string", description: "Sprint to add to" },
          },
          required: ["title", "description"],
        },
      },
      {
        name: "bridgemind_update_task",
        description: "Update an existing task on the BridgeMind board.",
        inputSchema: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "Task ID" },
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string" },
            priority: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
          },
          required: ["task_id"],
        },
      },
      {
        name: "bridgemind_get_knowledge",
        description: "Search the BridgeMind knowledge base for relevant information.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "bridgemind_add_knowledge",
        description: "Add a new entry to the BridgeMind knowledge base.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Entry title" },
            content: { type: "string", description: "Entry content" },
            tags: { type: "array", items: { type: "string" }, description: "Tags" },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "bridgemind_list_sprints",
        description: "List all sprints from BridgeMind.",
        inputSchema: { type: "object", properties: {} },
      },
    );
  }

  // GitHub Projects V2 tools
  if (isGitHubProjectsAvailable()) {
    tools.push(
      {
        name: "github_list_issues",
        description: "List issues from GitHub Projects V2 (read-only mirror of BridgeMind board).",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", description: "Filter by status" },
            first: { type: "number", default: 50, description: "Number of items" },
          },
        },
      },
      {
        name: "github_create_issue",
        description: "Create a new GitHub issue (for mirroring BridgeMind tasks).",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Issue title" },
            body: { type: "string", description: "Issue body (markdown)" },
            labels: { type: "array", items: { type: "string" }, description: "Labels" },
          },
          required: ["title", "body"],
        },
      },
      {
        name: "github_update_project_item",
        description: "Update a field value on a GitHub Projects V2 item.",
        inputSchema: {
          type: "object",
          properties: {
            item_id: { type: "string", description: "Project item ID" },
            field_id: { type: "string", description: "Field ID" },
            value: { type: "string", description: "New value" },
          },
          required: ["item_id", "field_id", "value"],
        },
      },
      {
        name: "github_get_pr_status",
        description: "Get PR and CI status for a GitHub issue.",
        inputSchema: {
          type: "object",
          properties: {
            issue_number: { type: "number", description: "Issue number" },
          },
          required: ["issue_number"],
        },
      },
    );
  }

  // Sync tools (available when both systems are configured)
  if (isBridgeMindAvailable() && isGitHubProjectsAvailable()) {
    tools.push(
      {
        name: "sync_bridgemind_to_github",
        description:
          "Sync BridgeMind board items to GitHub Projects V2 (one-way: BridgeMind → GitHub).",
        inputSchema: {
          type: "object",
          properties: {
            dry_run: { type: "boolean", default: false, description: "Preview without applying" },
          },
        },
      },
      {
        name: "sync_status",
        description: "Get the current sync status between BridgeMind and GitHub.",
        inputSchema: { type: "object", properties: {} },
      },
    );
  }

  // Bolt management tools (always available)
  tools.push(
    {
      name: "bolt_status",
      description: "Get the current Bolt orchestrator status, including active tasks and health.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "bolt_pause",
      description: "Pause the Bolt orchestrator. Active tasks continue but no new ones are started.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "bolt_resume",
      description: "Resume the Bolt orchestrator after a pause.",
      inputSchema: { type: "object", properties: {} },
    },
  );

  return tools;
}

// ========================================
// Tool Handler
// ========================================

type ToolResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

export async function handleGatewayToolCall(
  name: string,
  args: unknown,
): Promise<ToolResult> {
  try {
    // BridgeMind tools
    if (name.startsWith("bridgemind_")) {
      return await handleBridgeMindTool(name, args);
    }

    // GitHub tools
    if (name.startsWith("github_")) {
      return await handleGitHubTool(name, args);
    }

    // Sync tools
    if (name.startsWith("sync_")) {
      return await handleSyncTool(name, args);
    }

    // Bolt management tools
    if (name.startsWith("bolt_")) {
      return await handleBoltTool(name, args);
    }

    return {
      content: [{ type: "text", text: `Unknown gateway tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}

// ========================================
// BridgeMind Tool Handlers
// ========================================

async function handleBridgeMindTool(name: string, args: unknown): Promise<ToolResult> {
  if (!isBridgeMindAvailable()) {
    return {
      content: [{ type: "text", text: "BridgeMind is not configured. Set BRIDGEMIND_MCP_URL and BRIDGEMIND_API_KEY." }],
      isError: true,
    };
  }

  const client = new BridgeMindClient();

  switch (name) {
    case "bridgemind_list_tasks": {
      const params = BridgeMindListTasksSchema.parse(args);
      const result = await client.listTasks({
        status: params.status,
        sprintId: params.sprint_id,
        limit: params.limit,
      });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      const tasks = result.data ?? [];
      let text = `**BridgeMind Tasks (${tasks.length}):**\n\n`;
      for (const task of tasks) {
        text += `- **${task.title}** [${task.status}] (${task.priority})\n`;
        text += `  ID: ${task.id}\n`;
        if (task.labels?.length) text += `  Labels: ${task.labels.join(", ")}\n`;
        text += "\n";
      }

      return { content: [{ type: "text", text }] };
    }

    case "bridgemind_create_task": {
      const params = BridgeMindCreateTaskSchema.parse(args);
      const result = await client.createTask({
        title: params.title,
        description: params.description,
        priority: params.priority,
        labels: params.labels,
        sprintId: params.sprint_id,
      });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      return {
        content: [{
          type: "text",
          text: `**Task Created!**\n\n**ID:** ${result.data?.id}\n**Title:** ${result.data?.title}\n**Status:** ${result.data?.status}`,
        }],
      };
    }

    case "bridgemind_update_task": {
      const params = BridgeMindUpdateTaskSchema.parse(args);
      const { task_id, ...updates } = params;
      const result = await client.updateTask(task_id, updates);

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      return {
        content: [{ type: "text", text: `**Task Updated!**\n\n**ID:** ${result.data?.id}\n**Status:** ${result.data?.status}` }],
      };
    }

    case "bridgemind_get_knowledge": {
      const params = BridgeMindGetKnowledgeSchema.parse(args);
      const result = await client.getKnowledge(params.query);

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      const entries = result.data ?? [];
      let text = `**Knowledge Results (${entries.length}):**\n\n`;
      for (const entry of entries) {
        text += `### ${entry.title}\n${entry.content}\n\nTags: ${entry.tags.join(", ")}\n\n---\n\n`;
      }

      return { content: [{ type: "text", text }] };
    }

    case "bridgemind_add_knowledge": {
      const params = BridgeMindAddKnowledgeSchema.parse(args);
      const result = await client.addKnowledge({
        title: params.title,
        content: params.content,
        tags: params.tags,
      });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      return {
        content: [{ type: "text", text: `**Knowledge Added!**\n\n**ID:** ${result.data?.id}\n**Title:** ${result.data?.title}` }],
      };
    }

    case "bridgemind_list_sprints": {
      const result = await client.listSprints();

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      const sprints = result.data ?? [];
      let text = `**Sprints (${sprints.length}):**\n\n`;
      for (const sprint of sprints) {
        text += `- **${sprint.name}** [${sprint.status}]\n`;
        text += `  ${sprint.startDate} → ${sprint.endDate}\n`;
        if (sprint.goals?.length) text += `  Goals: ${sprint.goals.join(", ")}\n`;
        text += "\n";
      }

      return { content: [{ type: "text", text }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown BridgeMind tool: ${name}` }], isError: true };
  }
}

// ========================================
// GitHub Tool Handlers
// ========================================

async function handleGitHubTool(name: string, args: unknown): Promise<ToolResult> {
  if (!isGitHubProjectsAvailable()) {
    return {
      content: [{ type: "text", text: "GitHub Projects is not configured. Set GH_PAT_TOKEN and GITHUB_PROJECT_ID." }],
      isError: true,
    };
  }

  const client = new GitHubProjectsClient();

  switch (name) {
    case "github_list_issues": {
      const params = GitHubListIssuesSchema.parse(args);
      const result = await client.listItems({ first: params.first });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      const items = result.data?.items ?? [];
      let text = `**GitHub Project Items (${items.length}):**\n\n`;
      for (const item of items) {
        text += `- **${item.title}** [${item.status}]`;
        if (item.issueNumber) text += ` #${item.issueNumber}`;
        text += "\n";
        if (item.labels.length) text += `  Labels: ${item.labels.join(", ")}\n`;
        text += "\n";
      }

      return { content: [{ type: "text", text }] };
    }

    case "github_create_issue": {
      const params = GitHubCreateIssueSchema.parse(args);
      const result = await client.createIssue({
        title: params.title,
        body: params.body,
        labels: params.labels,
      });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      return {
        content: [{
          type: "text",
          text: `**Issue Created!**\n\n**Number:** #${result.data?.number}\n**URL:** ${result.data?.url}`,
        }],
      };
    }

    case "github_update_project_item": {
      const params = GitHubUpdateProjectItemSchema.parse(args);
      const result = await client.updateItemField(params.item_id, params.field_id, { text: params.value });

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

      return {
        content: [{ type: "text", text: "**Project item updated successfully!**" }],
      };
    }

    case "github_get_pr_status": {
      const params = GitHubGetPRStatusSchema.parse(args);
      const result = await client.getPRStatus(params.issue_number);

      if (result.error) {
        return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
      }

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

      return { content: [{ type: "text", text }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown GitHub tool: ${name}` }], isError: true };
  }
}

// ========================================
// Sync Tool Handlers
// ========================================

async function handleSyncTool(name: string, args: unknown): Promise<ToolResult> {
  switch (name) {
    case "sync_bridgemind_to_github": {
      const params = SyncTriggerSchema.parse(args);

      if (!isBridgeMindAvailable() || !isGitHubProjectsAvailable()) {
        return {
          content: [{ type: "text", text: "Both BridgeMind and GitHub must be configured for sync." }],
          isError: true,
        };
      }

      const bmClient = new BridgeMindClient();
      const ghClient = new GitHubProjectsClient();

      // Fetch BridgeMind tasks
      const bmResult = await bmClient.listTasks({ limit: 100 });
      if (bmResult.error) {
        return { content: [{ type: "text", text: `BridgeMind error: ${bmResult.error}` }], isError: true };
      }

      // Fetch GitHub items for comparison
      const ghResult = await ghClient.listAllItems();

      const bmTasks = bmResult.data ?? [];
      const ghItems = ghResult.data ?? [];

      // Find tasks that need syncing
      const existingTitles = new Set(ghItems.map((i) => i.title));
      const newTasks = bmTasks.filter((t) => !existingTitles.has(t.title));

      if (params.dry_run) {
        let text = `**Sync Preview (Dry Run):**\n\n`;
        text += `BridgeMind tasks: ${bmTasks.length}\n`;
        text += `GitHub items: ${ghItems.length}\n`;
        text += `New tasks to sync: ${newTasks.length}\n\n`;
        for (const task of newTasks) {
          text += `- **${task.title}** [${task.status}]\n`;
        }
        return { content: [{ type: "text", text }] };
      }

      // Create GitHub issues for new tasks
      let created = 0;
      let errors = 0;
      for (const task of newTasks) {
        const body = `## BridgeMind Mirror\n\n${task.description}\n\n---\n*Synced from BridgeMind ID: ${task.id}*`;
        const issueResult = await ghClient.createIssue({
          title: task.title,
          body,
          labels: task.labels,
        });

        if (issueResult.error) {
          errors++;
        } else {
          created++;
          // Add to project
          if (issueResult.data?.id) {
            await ghClient.addItemToProject(issueResult.data.id);
          }
        }
      }

      let text = `**Sync Complete!**\n\n`;
      text += `Created: ${created} issues\n`;
      if (errors > 0) text += `Errors: ${errors}\n`;
      text += `Total BridgeMind tasks: ${bmTasks.length}\n`;
      text += `Total GitHub items: ${ghItems.length + created}`;

      return { content: [{ type: "text", text }] };
    }

    case "sync_status": {
      const statusParts: string[] = [];

      if (isBridgeMindAvailable()) {
        const bmClient = new BridgeMindClient();
        const state = bmClient.getCircuitBreakerState();
        statusParts.push(
          `**BridgeMind:** ${state.status === "closed" ? "healthy" : state.status}` +
            (state.failures > 0 ? ` (${state.failures} failures)` : ""),
        );
      } else {
        statusParts.push("**BridgeMind:** not configured");
      }

      if (isGitHubProjectsAvailable()) {
        const ghClient = new GitHubProjectsClient();
        const rateLimit = ghClient.getRateLimitInfo();
        statusParts.push(
          `**GitHub:** configured` +
            (rateLimit ? ` (${rateLimit.remaining} API calls remaining)` : ""),
        );
      } else {
        statusParts.push("**GitHub:** not configured");
      }

      return {
        content: [{ type: "text", text: `**Sync Status:**\n\n${statusParts.join("\n")}` }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown sync tool: ${name}` }], isError: true };
  }
}

// ========================================
// Bolt Management Tool Handlers
// ========================================

// In-memory Bolt state (persisted via skill state file in real usage)
let boltPaused = false;

async function handleBoltTool(name: string, _args: unknown): Promise<ToolResult> {
  switch (name) {
    case "bolt_status": {
      const services: string[] = [];

      services.push(`**Orchestrator:** ${boltPaused ? "PAUSED" : "RUNNING"}`);

      if (isBridgeMindAvailable()) {
        const bm = new BridgeMindClient();
        services.push(`**BridgeMind:** ${bm.getCircuitBreakerState().status}`);
      } else {
        services.push("**BridgeMind:** not configured");
      }

      if (isGitHubProjectsAvailable()) {
        services.push("**GitHub Projects:** configured");
      } else {
        services.push("**GitHub Projects:** not configured");
      }

      return {
        content: [{
          type: "text",
          text: `**Bolt Status:**\n\n${services.join("\n")}\n\nUse \`/bolt sync\`, \`/bolt plan\`, \`/bolt check\`, or \`/bolt merge\` for operations.`,
        }],
      };
    }

    case "bolt_pause": {
      boltPaused = true;
      return {
        content: [{ type: "text", text: "**Bolt paused.** Active tasks continue but no new tasks will be started." }],
      };
    }

    case "bolt_resume": {
      boltPaused = false;
      return {
        content: [{ type: "text", text: "**Bolt resumed.** New tasks will be started again." }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown bolt tool: ${name}` }], isError: true };
  }
}

/**
 * Get Bolt paused state (for external checks)
 */
export function isBoltPaused(): boolean {
  return boltPaused;
}
