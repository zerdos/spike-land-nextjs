#!/usr/bin/env node
/**
 * Spike Land MCP Server
 *
 * Progressive Context Disclosure (PCD) MCP server for spike.land.
 * Starts with 5 always-on gateway discovery tools (~3K tokens).
 * All other tools are discoverable via search_tools and enable_category,
 * and activated on demand via McpServer's RegisteredTool.enable()/disable().
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SpikeLandClient } from "./client.js";
import { ToolRegistry } from "./registry.js";
import { registerGatewayMetaTools } from "./tools/gateway-meta/index.js";
import {
  getCodeSpaceTools,
  getCodeSpaceSchemas,
  handleCodeSpaceToolCall,
  isCodeSpaceAvailable,
} from "./tools/codespace/index.js";
import {
  getGatewayTools,
  getGatewaySchemas,
  handleGatewayToolCall,
  isGatewayAvailable,
} from "./tools/gateway/index.js";
import {
  getJulesTools,
  getJulesSchemas,
  handleJulesToolCall,
  isJulesAvailable,
} from "./tools/jules/index.js";

// ========================================
// Image Tool Zod Schemas
// ========================================

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

// ========================================
// Image Tool Registration
// ========================================

function registerImageTools(
  registry: ToolRegistry,
  client: SpikeLandClient,
): void {
  registry.register({
    name: "generate_image",
    description: `Generate a new image from a text prompt using Spike Land's AI.

Supported aspect ratios: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

Token costs:
- TIER_1K (1024px): 2 tokens
- TIER_2K (2048px): 5 tokens
- TIER_4K (4096px): 10 tokens

Returns the generated image URL when complete.`,
    category: "image",
    tier: "free",
    inputSchema: GenerateImageSchema.shape,
    handler: async ({
      prompt,
      tier,
      negative_prompt,
      aspect_ratio,
      wait_for_completion,
    }: z.infer<typeof GenerateImageSchema>): Promise<CallToolResult> => {
      const result = await client.generateImage({
        prompt,
        tier,
        negativePrompt: negative_prompt,
        aspectRatio: aspect_ratio,
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

      if (wait_for_completion) {
        const status = await client.waitForJob(result.jobId);
        return {
          content: [
            {
              type: "text",
              text: `Image generated successfully!\n\n**Job ID:** ${status.job.id}\n**Image URL:** ${status.job.outputImageUrl}\n**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}\n**Tokens Used:** ${status.job.tokensCost}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Image generation started!\n\n**Job ID:** ${result.jobId}\n**Tokens Reserved:** ${result.tokensCost}\n\nUse check_job with this job ID to check the status.`,
          },
        ],
      };
    },
  });

  registry.register({
    name: "modify_image",
    description: `Modify an existing image using a text prompt.

Provide either image_url or image_base64 for the source image.
The output aspect ratio is automatically detected from the input image.

Token costs:
- TIER_1K (1024px): 2 tokens
- TIER_2K (2048px): 5 tokens
- TIER_4K (4096px): 10 tokens

Returns the modified image URL when complete.`,
    category: "image",
    tier: "free",
    inputSchema: ModifyImageSchema.shape,
    handler: async ({
      prompt,
      image_url,
      image_base64,
      mime_type,
      tier,
      wait_for_completion,
    }: z.infer<typeof ModifyImageSchema>): Promise<CallToolResult> => {
      let imageBase64: string;
      let mimeType = mime_type || "image/jpeg";

      if (image_base64) {
        imageBase64 = image_base64;
      } else if (image_url) {
        const response = await fetch(image_url);
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
        prompt,
        image: imageBase64,
        mimeType,
        tier,
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

      if (wait_for_completion) {
        const status = await client.waitForJob(result.jobId);
        return {
          content: [
            {
              type: "text",
              text: `Image modified successfully!\n\n**Job ID:** ${status.job.id}\n**Image URL:** ${status.job.outputImageUrl}\n**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}\n**Tokens Used:** ${status.job.tokensCost}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Image modification started!\n\n**Job ID:** ${result.jobId}\n**Tokens Reserved:** ${result.tokensCost}\n\nUse check_job with this job ID to check the status.`,
          },
        ],
      };
    },
  });

  registry.register({
    name: "check_job",
    description:
      "Check the status of an image generation or modification job",
    category: "image",
    tier: "free",
    inputSchema: CheckJobSchema.shape,
    handler: async ({
      job_id,
    }: z.infer<typeof CheckJobSchema>): Promise<CallToolResult> => {
      const status = await client.getJobStatus(job_id);

      let statusText = `**Job ID:** ${status.job.id}\n**Type:** ${status.job.type}\n**Status:** ${status.job.status}\n**Tokens Cost:** ${status.job.tokensCost}\n**Prompt:** ${status.job.prompt}`;

      if (
        status.job.status === "COMPLETED" &&
        status.job.outputImageUrl
      ) {
        statusText += `\n**Image URL:** ${status.job.outputImageUrl}\n**Dimensions:** ${status.job.outputWidth}x${status.job.outputHeight}`;
      }

      if (status.job.status === "FAILED" && status.job.errorMessage) {
        statusText += `\n**Error:** ${status.job.errorMessage}`;
      }

      return { content: [{ type: "text", text: statusText }] };
    },
  });
}

// ========================================
// Legacy Tool Bridge
// ========================================

/**
 * Register existing tools from a module that uses the old getTools/handleToolCall pattern.
 * Maps each tool to the registry with its Zod schema and delegates to the existing handler.
 */
function registerLegacyTools(
  registry: ToolRegistry,
  category: string,
  tier: "free" | "workspace",
  tools: Array<{ name: string; description?: string }>,
  schemas: Record<string, z.ZodObject<z.ZodRawShape>>,
  handler: (
    name: string,
    args: unknown,
  ) => Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>; isError?: boolean }>,
): void {
  for (const tool of tools) {
    const schema = schemas[tool.name];
    registry.register({
      name: tool.name,
      description: tool.description || tool.name,
      category,
      tier,
      inputSchema: schema?.shape,
      handler: async (
        args: unknown,
      ): Promise<CallToolResult> => {
        const result = await handler(tool.name, args);
        return result as CallToolResult;
      },
    });
  }
}

// ========================================
// Main
// ========================================

async function main() {
  // Get API key from environment
  const apiKey = process.env.SPIKE_LAND_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: SPIKE_LAND_API_KEY environment variable is required",
    );
    console.error("Get your API key at: https://spike.land/settings");
    process.exit(1);
  }

  // Create client
  const client = new SpikeLandClient(apiKey);

  // Create MCP server with Progressive Context Disclosure
  const mcpServer = new McpServer(
    {
      name: "spike-land",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    },
  );

  // Create progressive tool registry
  const registry = new ToolRegistry(mcpServer);

  // Register always-on gateway meta tools (5 tools, ~3K tokens)
  registerGatewayMetaTools(registry, client);

  // Register image tools (disabled by default, discoverable)
  registerImageTools(registry, client);

  // Register CodeSpace tools (disabled by default, discoverable)
  if (isCodeSpaceAvailable()) {
    registerLegacyTools(
      registry,
      "codespace",
      "free",
      getCodeSpaceTools(),
      getCodeSpaceSchemas(),
      handleCodeSpaceToolCall,
    );
  }

  // Register Jules tools (disabled by default, discoverable)
  if (isJulesAvailable()) {
    registerLegacyTools(
      registry,
      "jules",
      "free",
      getJulesTools(),
      getJulesSchemas(),
      handleJulesToolCall,
    );
  }

  // Register Gateway tools (disabled by default, discoverable)
  if (isGatewayAvailable()) {
    registerLegacyTools(
      registry,
      "gateway",
      "free",
      getGatewayTools(),
      getGatewaySchemas(),
      handleGatewayToolCall,
    );
  }

  // Start the server
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  console.error(
    `Spike Land MCP Server started (${registry.getToolCount()} tools registered, ${registry.getEnabledCount()} active)`,
  );
  console.error(
    "Progressive Context Disclosure: Only 5 gateway tools loaded initially.",
  );
  console.error(
    'Use search_tools or enable_category to discover and activate tools.',
  );

  if (isCodeSpaceAvailable()) {
    console.error("CodeSpace integration available (discoverable)");
  }
  if (isJulesAvailable()) {
    console.error("Jules integration available (discoverable)");
  }
  if (isGatewayAvailable()) {
    console.error("Gateway tools available (discoverable)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
