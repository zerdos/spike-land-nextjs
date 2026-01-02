/**
 * CodeSpace MCP Tools
 *
 * MCP tools for creating, updating, and managing live React applications
 * on testing.spike.land. These tools allow AI assistants to build and
 * iterate on web applications in real-time.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CodeSpaceClient } from "./client.js";

// Check if CodeSpace tools are available (requires API key)
export function isCodeSpaceAvailable(): boolean {
  return !!process.env.SPIKE_LAND_API_KEY;
}

// Tool parameter schemas
const UpdateCodeSchema = z.object({
  codespace_id: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Codespace ID must be alphanumeric with hyphens and underscores",
    )
    .describe(
      "Unique identifier for the codespace (creates if doesn't exist)",
    ),
  code: z
    .string()
    .min(1)
    .describe("JSX/TSX code for the React component"),
  run: z
    .boolean()
    .optional()
    .default(true)
    .describe("Transpile immediately after update (default: true)"),
});

const CodeSpaceIdSchema = z.object({
  codespace_id: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Codespace ID must be alphanumeric with hyphens and underscores",
    )
    .describe("Unique identifier for the codespace"),
});

const LinkAppSchema = z.object({
  codespace_id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .describe("Codespace ID to link"),
  app_id: z
    .string()
    .min(1)
    .describe(
      "App ID to link the codespace to (optional - creates new app if not provided)",
    ),
  app_name: z
    .string()
    .min(3)
    .max(50)
    .optional()
    .describe("Name for new app (required if app_id not provided)"),
  app_description: z
    .string()
    .min(10)
    .max(500)
    .optional()
    .describe("Description for new app"),
});

// Tool definitions
export function getCodeSpaceTools(): Tool[] {
  if (!isCodeSpaceAvailable()) {
    return [];
  }

  return [
    {
      name: "codespace_update",
      description: `Create or update a live React application on testing.spike.land.

Creates a new codespace if the ID doesn't exist, or updates existing code.
The app is immediately available at: https://testing.spike.land/live/{codespace_id}

Use this to:
- Create new React components/apps
- Iterate on existing code
- Build interactive prototypes

Returns the live URL and transpilation status.`,
      inputSchema: {
        type: "object",
        properties: {
          codespace_id: {
            type: "string",
            description:
              "Unique ID for the codespace (alphanumeric, hyphens, underscores). Creates if doesn't exist.",
          },
          code: {
            type: "string",
            description: "JSX/TSX code for the React component",
          },
          run: {
            type: "boolean",
            default: true,
            description: "Transpile immediately after update (default: true)",
          },
        },
        required: ["codespace_id", "code"],
      },
    },
    {
      name: "codespace_run",
      description: `Transpile and render a codespace without updating code.

Use this to re-run transpilation after making changes or to ensure
the latest version is rendered.

Returns transpilation status.`,
      inputSchema: {
        type: "object",
        properties: {
          codespace_id: {
            type: "string",
            description: "Unique ID for the codespace",
          },
        },
        required: ["codespace_id"],
      },
    },
    {
      name: "codespace_screenshot",
      description: `Get a JPEG screenshot of a running codespace.

Captures the current visual state of the React app.
Useful for:
- Verifying UI changes
- Sharing previews
- Debugging layout issues

Returns base64-encoded JPEG image.`,
      inputSchema: {
        type: "object",
        properties: {
          codespace_id: {
            type: "string",
            description: "Unique ID for the codespace",
          },
        },
        required: ["codespace_id"],
      },
    },
    {
      name: "codespace_get",
      description: `Get the current code and session data for a codespace.

Returns:
- Current source code
- Transpiled output
- Hash/version info
- Metadata

Use this to inspect existing codespaces before making changes.`,
      inputSchema: {
        type: "object",
        properties: {
          codespace_id: {
            type: "string",
            description: "Unique ID for the codespace",
          },
        },
        required: ["codespace_id"],
      },
    },
    {
      name: "codespace_link_app",
      description: `Link a codespace to the user's my-apps on spike.land.

This saves the codespace as an app in the user's account, making it
accessible from the spike.land dashboard.

You can either:
- Link to an existing app (provide app_id)
- Create a new app (provide app_name and optionally app_description)`,
      inputSchema: {
        type: "object",
        properties: {
          codespace_id: {
            type: "string",
            description: "Codespace ID to link",
          },
          app_id: {
            type: "string",
            description: "Existing app ID to link the codespace to",
          },
          app_name: {
            type: "string",
            description: "Name for new app (if creating new)",
          },
          app_description: {
            type: "string",
            description: "Description for new app (if creating new)",
          },
        },
        required: ["codespace_id"],
      },
    },
    {
      name: "codespace_list_my_apps",
      description: `List the user's apps from spike.land.

Returns all apps owned by the user, including any linked codespaces.
Useful for finding existing apps to link codespaces to.`,
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ];
}

/**
 * Handle CodeSpace tool calls
 */
export async function handleCodeSpaceToolCall(
  name: string,
  args: unknown,
): Promise<{
  content: Array<
    { type: string; text?: string; data?: string; mimeType?: string; }
  >;
  isError?: boolean;
}> {
  if (!isCodeSpaceAvailable()) {
    return {
      content: [
        {
          type: "text",
          text: "CodeSpace API requires SPIKE_LAND_API_KEY environment variable.",
        },
      ],
      isError: true,
    };
  }

  const client = new CodeSpaceClient(process.env.SPIKE_LAND_API_KEY!);

  try {
    switch (name) {
      case "codespace_update": {
        const params = UpdateCodeSchema.parse(args);
        const result = await client.updateCode(
          params.codespace_id,
          params.code,
          params.run,
        );

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const liveUrl = client.getLiveUrl(params.codespace_id);
        let text = `**CodeSpace Updated Successfully!**\n\n`;
        text += `**ID:** ${result.data?.codeSpace}\n`;
        text += `**Hash:** ${result.data?.hash}\n`;
        text += `**Updated:** ${result.data?.updated?.join(", ") || "code"}\n`;
        text += `**Live URL:** ${liveUrl}\n`;
        text += `\nThe app is now live and running.`;

        return { content: [{ type: "text", text }] };
      }

      case "codespace_run": {
        const params = CodeSpaceIdSchema.parse(args);
        const result = await client.run(params.codespace_id);

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const liveUrl = client.getLiveUrl(params.codespace_id);
        let text = `**CodeSpace Transpiled!**\n\n`;
        text += `**ID:** ${result.data?.codeSpace}\n`;
        text += `**Hash:** ${result.data?.hash}\n`;
        text += `**Transpiled:** ${result.data?.transpiled ? "Yes" : "No"}\n`;
        text += `**Live URL:** ${liveUrl}`;

        return { content: [{ type: "text", text }] };
      }

      case "codespace_screenshot": {
        const params = CodeSpaceIdSchema.parse(args);
        const result = await client.getScreenshot(params.codespace_id);

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const liveUrl = client.getLiveUrl(params.codespace_id);

        return {
          content: [
            {
              type: "text",
              text: `**Screenshot of ${params.codespace_id}**\nLive URL: ${liveUrl}`,
            },
            {
              type: "image",
              data: result.data!.base64,
              mimeType: result.data!.mimeType,
            },
          ],
        };
      }

      case "codespace_get": {
        const params = CodeSpaceIdSchema.parse(args);
        const result = await client.getSession(params.codespace_id);

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const liveUrl = client.getLiveUrl(params.codespace_id);
        const session = result.data?.session;
        let text = `**CodeSpace Details**\n\n`;
        text += `**ID:** ${result.data?.codeSpace}\n`;
        text += `**Hash:** ${result.data?.hash}\n`;
        text += `**Live URL:** ${liveUrl}\n`;
        if (session?.createdAt) {
          text += `**Created:** ${session.createdAt}\n`;
        }
        if (session?.updatedAt) {
          text += `**Updated:** ${session.updatedAt}\n`;
        }
        text += `\n**Source Code:**\n\`\`\`tsx\n${session?.code}\n\`\`\``;

        return { content: [{ type: "text", text }] };
      }

      case "codespace_link_app": {
        const params = LinkAppSchema.parse(args);

        // If app_id provided, link to existing app
        if (params.app_id) {
          const result = await client.linkCodespaceToApp(
            params.app_id,
            params.codespace_id,
          );

          if (result.error) {
            return {
              content: [{ type: "text", text: `Error: ${result.error}` }],
              isError: true,
            };
          }

          const liveUrl = client.getLiveUrl(params.codespace_id);
          let text = `**Codespace Linked to App!**\n\n`;
          text += `**App ID:** ${result.data?.id}\n`;
          text += `**App Name:** ${result.data?.name}\n`;
          text += `**Codespace ID:** ${params.codespace_id}\n`;
          text += `**Live URL:** ${liveUrl}\n`;

          return { content: [{ type: "text", text }] };
        }

        // Otherwise create a new app with the codespace
        if (!params.app_name) {
          return {
            content: [
              {
                type: "text",
                text: "Either app_id or app_name must be provided",
              },
            ],
            isError: true,
          };
        }

        const result = await client.createApp({
          name: params.app_name,
          description: params.app_description ||
            `App created from codespace ${params.codespace_id}`,
          requirements: "Codespace-based app",
          monetizationModel: "free",
          codespaceId: params.codespace_id,
        });

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const liveUrl = client.getLiveUrl(params.codespace_id);
        let text = `**App Created with Codespace!**\n\n`;
        text += `**App ID:** ${result.data?.id}\n`;
        text += `**App Name:** ${result.data?.name}\n`;
        text += `**Codespace ID:** ${params.codespace_id}\n`;
        text += `**Live URL:** ${liveUrl}\n`;
        text += `\nView in My Apps: https://spike.land/my-apps`;

        return { content: [{ type: "text", text }] };
      }

      case "codespace_list_my_apps": {
        const result = await client.listApps();

        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        const apps = result.data || [];
        let text = `**My Apps (${apps.length}):**\n\n`;

        if (apps.length === 0) {
          text += "No apps found. Create one using codespace_link_app.";
        } else {
          for (const app of apps) {
            text += `- **${app.name}** (${app.status})\n`;
            text += `  ID: ${app.id}\n`;
            if (app.codespaceId) {
              text += `  Codespace: ${app.codespaceId}\n`;
              text += `  Live URL: ${app.codespaceUrl}\n`;
            }
            text += "\n";
          }
        }

        return { content: [{ type: "text", text }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown CodeSpace tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}
