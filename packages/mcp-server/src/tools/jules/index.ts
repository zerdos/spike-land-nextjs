/**
 * Jules MCP Tools
 *
 * MCP tools for interacting with Google's Jules async coding agent.
 * These tools are conditionally registered when JULES_API_KEY is set.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { JulesClient } from "./client.js";

// Check if Jules is available
export function isJulesAvailable(): boolean {
  return !!process.env.JULES_API_KEY;
}

// Tool parameter schemas
export const ListSessionsSchema = z.object({
  status: z
    .enum([
      "QUEUED",
      "PLANNING",
      "AWAITING_PLAN_APPROVAL",
      "IN_PROGRESS",
      "COMPLETED",
      "FAILED",
    ])
    .optional()
    .describe("Filter by session status"),
  page_size: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Number of sessions to return"),
});

export const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200).describe("Short title for the task"),
  task: z.string().min(1).max(4000).describe("Detailed task description"),
  source_repo: z
    .string()
    .optional()
    .describe("GitHub repo in format 'owner/repo' (default: current repo)"),
  starting_branch: z
    .string()
    .optional()
    .default("main")
    .describe("Branch to start from"),
});

export const GetSessionSchema = z.object({
  session_id: z.string().describe("Jules session ID"),
  include_activities: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include recent activities"),
});

export const ApprovePlanSchema = z.object({
  session_id: z.string().describe("Jules session ID to approve"),
});

export const SendMessageSchema = z.object({
  session_id: z.string().describe("Jules session ID"),
  message: z.string().min(1).max(4000).describe("Message to send"),
});

// Tool definitions
export function getJulesTools(): Tool[] {
  if (!isJulesAvailable()) {
    return [];
  }

  return [
    {
      name: "jules_list_sessions",
      description: `List all Jules coding sessions with their current status.

Jules is an async coding agent that can work on tasks in the background.
Use this to see all active and completed coding tasks.

Returns: List of sessions with ID, title, status, and creation time.`,
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: [
              "QUEUED",
              "PLANNING",
              "AWAITING_PLAN_APPROVAL",
              "IN_PROGRESS",
              "COMPLETED",
              "FAILED",
            ],
            description: "Filter by session status",
          },
          page_size: {
            type: "number",
            default: 20,
            description: "Number of sessions to return (1-50)",
          },
        },
        required: [],
      },
    },
    {
      name: "jules_create_session",
      description: `Create a new Jules coding task for async implementation.

Jules will analyze the task, create a plan, and ask for approval before starting.
The task will run in the background and create a PR when complete.

Best for:
- Bug fixes
- New features
- Test writing
- Dependency updates
- Code refactoring`,
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title for the task (max 200 chars)",
          },
          task: {
            type: "string",
            description: "Detailed task description (max 4000 chars)",
          },
          source_repo: {
            type: "string",
            description: "GitHub repo in format 'owner/repo'",
          },
          starting_branch: {
            type: "string",
            default: "main",
            description: "Branch to start from",
          },
        },
        required: ["title", "task"],
      },
    },
    {
      name: "jules_get_session",
      description: `Get details and activities for a Jules session.

Returns the session status, plan summary, activities, and PR URL if created.`,
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Jules session ID",
          },
          include_activities: {
            type: "boolean",
            default: true,
            description: "Include recent activities",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "jules_approve_plan",
      description: `Approve the implementation plan for a Jules session.

Call this after reviewing the plan. Jules will start coding once approved.`,
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Jules session ID to approve",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "jules_send_message",
      description: `Send a message to an active Jules session for clarification or updates.

Use this to:
- Ask Jules to modify the approach
- Provide additional context
- Request changes to the implementation`,
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Jules session ID",
          },
          message: {
            type: "string",
            description: "Message to send (max 4000 chars)",
          },
        },
        required: ["session_id", "message"],
      },
    },
  ];
}

/**
 * Handle Jules tool calls
 */
export async function handleJulesToolCall(
  name: string,
  args: unknown,
): Promise<{ content: Array<{ type: string; text: string; }>; isError?: boolean; }> {
  if (!isJulesAvailable()) {
    return {
      content: [
        {
          type: "text",
          text: "Jules API is not configured. Set JULES_API_KEY environment variable.",
        },
      ],
      isError: true,
    };
  }

  const client = new JulesClient(process.env.JULES_API_KEY!);

  try {
    switch (name) {
      case "jules_list_sessions": {
        const params = ListSessionsSchema.parse(args);
        const result = await client.listSessions(params.page_size);

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const sessions = result.data?.sessions || [];
        let text = `**Jules Sessions (${sessions.length}):**\n\n`;

        if (sessions.length === 0) {
          text += "No sessions found.";
        } else {
          for (const session of sessions) {
            text += `- **${session.title || session.name}**\n`;
            text += `  ID: ${session.name}\n`;
            text += `  Status: ${session.state}\n`;
            if (session.url) {
              text += `  URL: ${session.url}\n`;
            }
            text += "\n";
          }
        }

        return { content: [{ type: "text", text }] };
      }

      case "jules_create_session": {
        const params = CreateSessionSchema.parse(args);
        const source = params.source_repo
          ? `sources/github/${params.source_repo}`
          : `sources/github/${process.env.GITHUB_OWNER || "zerdos"}/${
            process.env.GITHUB_REPO || "spike-land-nextjs"
          }`;

        const result = await client.createSession({
          prompt: params.task,
          sourceContext: {
            source,
            githubRepoContext: {
              startingBranch: params.starting_branch,
            },
          },
          title: params.title,
          requirePlanApproval: true,
        });

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const session = result.data;
        let text = `**Jules Session Created!**\n\n`;
        text += `**Title:** ${params.title}\n`;
        text += `**Session ID:** ${session?.name}\n`;
        text += `**Status:** ${session?.state}\n`;
        if (session?.url) {
          text += `**URL:** ${session.url}\n`;
        }
        text +=
          `\nJules will analyze the task and create a plan. Use jules_get_session to check progress.`;

        return { content: [{ type: "text", text }] };
      }

      case "jules_get_session": {
        const params = GetSessionSchema.parse(args);
        const sessionResult = await client.getSession(params.session_id);

        if (sessionResult.error) {
          return {
            content: [{ type: "text", text: `Error: ${sessionResult.error}` }],
            isError: true,
          };
        }

        const session = sessionResult.data;
        let text = `**Jules Session Details**\n\n`;
        text += `**ID:** ${session?.name}\n`;
        text += `**Status:** ${session?.state}\n`;
        text += `**Title:** ${session?.title || "Untitled"}\n`;
        if (session?.url) {
          text += `**URL:** ${session.url}\n`;
        }
        if (session?.planSummary) {
          text += `\n**Plan Summary:**\n${session.planSummary}\n`;
        }

        // Get activities if requested
        if (params.include_activities) {
          const activitiesResult = await client.listActivities(
            params.session_id,
            10,
          );
          if (activitiesResult.data?.activities?.length) {
            text += `\n**Recent Activities:**\n`;
            for (const activity of activitiesResult.data.activities) {
              text += `- ${activity.type || "Activity"}: ${activity.content || "(no content)"}\n`;
            }
          }
        }

        return { content: [{ type: "text", text }] };
      }

      case "jules_approve_plan": {
        const params = ApprovePlanSchema.parse(args);
        const result = await client.approvePlan(params.session_id);

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        let text = `**Plan Approved!**\n\n`;
        text += `**Session:** ${params.session_id}\n`;
        text += `**New Status:** ${result.data?.state || "IN_PROGRESS"}\n`;
        text += `\nJules will now start implementing the plan.`;

        return { content: [{ type: "text", text }] };
      }

      case "jules_send_message": {
        const params = SendMessageSchema.parse(args);
        const result = await client.sendMessage(
          params.session_id,
          params.message,
        );

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        let text = `**Message Sent!**\n\n`;
        text += `**To Session:** ${params.session_id}\n`;
        text += `**Message:** ${params.message}\n`;
        text += `\nJules will process your message and respond.`;

        return { content: [{ type: "text", text }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown Jules tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}
