#!/usr/bin/env node
/**
 * Spike Land MCP Server
 *
 * MCP (Model Context Protocol) server for Spike Land image generation and modification.
 * This server allows Claude Desktop and Claude Code to generate and modify images
 * using the Spike Land API.
 *
 * Usage:
 *   SPIKE_LAND_API_KEY=sk_live_... npx @spike-npm-land/mcp-server
 *
 * Configuration for Claude Desktop (~/.config/claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "spike-land": {
 *         "command": "npx",
 *         "args": ["@spike-npm-land/mcp-server"],
 *         "env": { "SPIKE_LAND_API_KEY": "sk_live_..." }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SpikeLandClient } from "./client.js";
import {
  getCodeSpaceTools,
  handleCodeSpaceToolCall,
  isCodeSpaceAvailable,
} from "./tools/codespace/index.js";
import { getJulesTools, handleJulesToolCall, isJulesAvailable } from "./tools/jules/index.js";

// Supported aspect ratios
const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

// Tool parameter schemas
const GenerateImageSchema = z.object({
  prompt: z.string().describe("Text description of the image to generate"),
  tier: z
    .enum(["TIER_1K", "TIER_2K", "TIER_4K"])
    .optional()
    .default("TIER_1K")
    .describe(
      "Quality tier: TIER_1K (1024px, 2 tokens), TIER_2K (2048px, 5 tokens), TIER_4K (4096px, 10 tokens)",
    ),
  negative_prompt: z
    .string()
    .optional()
    .describe("Things to avoid in the generated image"),
  aspect_ratio: z
    .enum(SUPPORTED_ASPECT_RATIOS)
    .optional()
    .describe(
      "Output aspect ratio. Supported: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (default: 1:1)",
    ),
  wait_for_completion: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to wait for the job to complete before returning"),
});

const ModifyImageSchema = z.object({
  prompt: z.string().describe("Text description of how to modify the image"),
  image_url: z.string().optional().describe(
    "URL of the image to modify (provide either image_url or image_base64)",
  ),
  image_base64: z.string().optional().describe(
    "Base64-encoded image data (provide either image_url or image_base64)",
  ),
  mime_type: z
    .string()
    .optional()
    .default("image/jpeg")
    .describe("MIME type of the image (e.g., image/jpeg, image/png)"),
  tier: z
    .enum(["TIER_1K", "TIER_2K", "TIER_4K"])
    .optional()
    .default("TIER_1K")
    .describe(
      "Quality tier: TIER_1K (1024px, 2 tokens), TIER_2K (2048px, 5 tokens), TIER_4K (4096px, 10 tokens)",
    ),
  wait_for_completion: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to wait for the job to complete before returning"),
});

const CheckJobSchema = z.object({
  job_id: z.string().describe("The job ID to check"),
});

// Tool definitions
const tools: Tool[] = [
  {
    name: "generate_image",
    description: `Generate a new image from a text prompt using Spike Land's AI.

Supported aspect ratios: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

Token costs:
- TIER_1K (1024px): 2 tokens
- TIER_2K (2048px): 5 tokens
- TIER_4K (4096px): 10 tokens

Returns the generated image URL when complete.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of the image to generate",
        },
        tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          default: "TIER_1K",
          description: "Quality tier: TIER_1K (1024px), TIER_2K (2048px), TIER_4K (4096px)",
        },
        negative_prompt: {
          type: "string",
          description: "Things to avoid in the generated image",
        },
        aspect_ratio: {
          type: "string",
          enum: [
            "1:1",
            "3:2",
            "2:3",
            "3:4",
            "4:3",
            "4:5",
            "5:4",
            "9:16",
            "16:9",
            "21:9",
          ],
          default: "1:1",
          description: "Output aspect ratio for the generated image",
        },
        wait_for_completion: {
          type: "boolean",
          default: true,
          description: "Wait for the job to complete before returning",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "modify_image",
    description: `Modify an existing image using a text prompt.

Provide either image_url or image_base64 for the source image.
The output aspect ratio is automatically detected from the input image.

Token costs:
- TIER_1K (1024px): 2 tokens
- TIER_2K (2048px): 5 tokens
- TIER_4K (4096px): 10 tokens

Returns the modified image URL when complete.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of how to modify the image",
        },
        image_url: {
          type: "string",
          description: "URL of the image to modify",
        },
        image_base64: {
          type: "string",
          description: "Base64-encoded image data",
        },
        mime_type: {
          type: "string",
          default: "image/jpeg",
          description: "MIME type of the image",
        },
        tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          default: "TIER_1K",
          description: "Quality tier",
        },
        wait_for_completion: {
          type: "boolean",
          default: true,
          description: "Wait for the job to complete before returning",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "check_job",
    description: "Check the status of an image generation or modification job",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "The job ID to check",
        },
      },
      required: ["job_id"],
    },
  },
  {
    name: "get_balance",
    description: "Get the current token balance for image generation and modification",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

async function main() {
  // Get API key from environment
  const apiKey = process.env.SPIKE_LAND_API_KEY;

  if (!apiKey) {
    console.error("Error: SPIKE_LAND_API_KEY environment variable is required");
    console.error("Get your API key at: https://spike.land/settings");
    process.exit(1);
  }

  // Create client
  const client = new SpikeLandClient(apiKey);

  // Create MCP server
  const server = new Server(
    {
      name: "spike-land",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Get all available tools (including Jules and CodeSpace if configured)
  const allTools = [...tools, ...getJulesTools(), ...getCodeSpaceTools()];

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "generate_image": {
          const params = GenerateImageSchema.parse(args);

          const result = await client.generateImage({
            prompt: params.prompt,
            tier: params.tier,
            negativePrompt: params.negative_prompt,
            aspectRatio: params.aspect_ratio,
          });

          if (!result.success || !result.jobId) {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to start image generation: ${result.error || "Unknown error"}`,
                },
              ],
              isError: true,
            };
          }

          if (params.wait_for_completion) {
            const status = await client.waitForJob(result.jobId);

            return {
              content: [
                {
                  type: "text",
                  text: `Image generated successfully!

**Job ID:** ${status.job.id}
**Image URL:** ${status.job.outputImageUrl}
**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}
**Tokens Used:** ${status.job.tokensCost}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Image generation started!

**Job ID:** ${result.jobId}
**Tokens Reserved:** ${result.tokensCost}

Use check_job with this job ID to check the status.`,
                },
              ],
            };
          }
        }

        case "modify_image": {
          const params = ModifyImageSchema.parse(args);

          // Get image data
          let imageBase64: string;
          let mimeType = params.mime_type || "image/jpeg";

          if (params.image_base64) {
            imageBase64 = params.image_base64;
          } else if (params.image_url) {
            // Fetch image from URL
            const response = await fetch(params.image_url);
            if (!response.ok) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Failed to fetch image from URL: ${response.statusText}`,
                  },
                ],
                isError: true,
              };
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBase64 = Buffer.from(arrayBuffer).toString("base64");
            mimeType = response.headers.get("content-type") || mimeType;
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: "Either image_url or image_base64 must be provided",
                },
              ],
              isError: true,
            };
          }

          const result = await client.modifyImage({
            prompt: params.prompt,
            image: imageBase64,
            mimeType,
            tier: params.tier,
          });

          if (!result.success || !result.jobId) {
            return {
              content: [
                {
                  type: "text",
                  text: `Failed to start image modification: ${result.error || "Unknown error"}`,
                },
              ],
              isError: true,
            };
          }

          if (params.wait_for_completion) {
            const status = await client.waitForJob(result.jobId);

            return {
              content: [
                {
                  type: "text",
                  text: `Image modified successfully!

**Job ID:** ${status.job.id}
**Image URL:** ${status.job.outputImageUrl}
**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}
**Tokens Used:** ${status.job.tokensCost}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Image modification started!

**Job ID:** ${result.jobId}
**Tokens Reserved:** ${result.tokensCost}

Use check_job with this job ID to check the status.`,
                },
              ],
            };
          }
        }

        case "check_job": {
          const params = CheckJobSchema.parse(args);
          const status = await client.getJobStatus(params.job_id);

          let statusText = `**Job ID:** ${status.job.id}
**Type:** ${status.job.type}
**Status:** ${status.job.status}
**Tokens Cost:** ${status.job.tokensCost}
**Prompt:** ${status.job.prompt}`;

          if (status.job.status === "COMPLETED" && status.job.outputImageUrl) {
            statusText += `
**Image URL:** ${status.job.outputImageUrl}
**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}`;
          }

          if (status.job.status === "FAILED" && status.job.errorMessage) {
            statusText += `
**Error:** ${status.job.errorMessage}`;
          }

          return {
            content: [
              {
                type: "text",
                text: statusText,
              },
            ],
          };
        }

        case "get_balance": {
          const balance = await client.getBalance();

          return {
            content: [
              {
                type: "text",
                text: `**Token Balance:** ${balance.balance}

Token costs:
- 1K Quality (1024px): 2 tokens
- 2K Quality (2048px): 5 tokens
- 4K Quality (4096px): 10 tokens

Get more tokens at: https://spike.land/settings`,
              },
            ],
          };
        }

        default:
          // Check if it's a Jules tool
          if (name.startsWith("jules_") && isJulesAvailable()) {
            return await handleJulesToolCall(name, args);
          }
          // Check if it's a CodeSpace tool
          if (name.startsWith("codespace_") && isCodeSpaceAvailable()) {
            return await handleCodeSpaceToolCall(name, args);
          }
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Spike Land MCP Server started");
  if (isJulesAvailable()) {
    console.error("Jules integration enabled (JULES_API_KEY detected)");
  }
  if (isCodeSpaceAvailable()) {
    console.error("CodeSpace integration enabled (SPIKE_LAND_API_KEY detected)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
