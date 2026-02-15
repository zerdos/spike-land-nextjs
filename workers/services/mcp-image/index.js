// MCP Domain Worker: Image
// Handles: image, enhancement-jobs, batch-enhance, pipelines

const TOOLS = [
  // ── image ──
  {
    name: "generate_image",
    description:
      "Generate a new image from a text prompt using Spike Land's AI.\n\n" +
      "Supported aspect ratios: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9\n\n" +
      "Token costs: TIER_1K (1024px): 2, TIER_2K (2048px): 5, TIER_4K (4096px): 10",
    category: "image",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Text description of the image to generate" },
        tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          default: "TIER_1K",
          description: "Enhancement tier",
        },
        negative_prompt: { type: "string", description: "Things to avoid" },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
          description: "Aspect ratio for the generated image",
        },
        wait_for_completion: {
          type: "boolean",
          default: true,
          description: "Whether to wait for generation to complete",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "modify_image",
    description:
      "Modify an existing image using a text prompt.\n\n" +
      "Provide image_url or image_base64.\n\n" +
      "Token costs: TIER_1K: 2, TIER_2K: 5, TIER_4K: 10",
    category: "image",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "How to modify the image" },
        image_url: { type: "string", description: "URL of the image to modify" },
        image_base64: { type: "string", description: "Base64 encoded image data" },
        mime_type: { type: "string", default: "image/jpeg", description: "MIME type of the image" },
        tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          default: "TIER_1K",
          description: "Enhancement tier",
        },
        wait_for_completion: {
          type: "boolean",
          default: true,
          description: "Whether to wait for modification to complete",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "check_job",
    description: "Check the status of an image generation or modification job",
    category: "image",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "The job ID to check" },
      },
      required: ["job_id"],
    },
  },

  // ── enhancement-jobs ──
  {
    name: "enhance_image",
    description:
      "Start a single image enhancement. Credits are consumed upfront. Returns a job ID for tracking progress.",
    category: "enhancement-jobs",
    inputSchema: {
      type: "object",
      properties: {
        image_id: { type: "string", minLength: 1, description: "Image ID to enhance." },
        tier: {
          type: "string",
          enum: ["FREE", "TIER_1K", "TIER_2K", "TIER_4K"],
          description: "Enhancement tier. FREE=0 credits, TIER_1K=2, TIER_2K=5, TIER_4K=10.",
        },
      },
      required: ["image_id", "tier"],
    },
  },
  {
    name: "cancel_enhancement_job",
    description:
      "Cancel an enhancement job. Only PENDING or PROCESSING jobs can be cancelled. Credits are automatically refunded.",
    category: "enhancement-jobs",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", minLength: 1, description: "Enhancement job ID to cancel." },
      },
      required: ["job_id"],
    },
  },
  {
    name: "get_enhancement_job",
    description: "Get the status and details of an enhancement job.",
    category: "enhancement-jobs",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", minLength: 1, description: "Enhancement job ID." },
      },
      required: ["job_id"],
    },
  },
  {
    name: "list_enhancement_jobs",
    description: "List enhancement jobs with optional filters. Shows job history and current status.",
    category: "enhancement-jobs",
    inputSchema: {
      type: "object",
      properties: {
        image_id: { type: "string", description: "Filter by image ID." },
        status: {
          type: "string",
          enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"],
          description: "Filter by job status.",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          default: 20,
          description: "Max jobs to return. Default: 20.",
        },
      },
      required: [],
    },
  },

  // ── batch-enhance ──
  {
    name: "batch_enhance_images",
    description: "Enhance multiple images in a single batch. Credits are consumed upfront. Maximum 20 images per batch.",
    category: "batch-enhance",
    inputSchema: {
      type: "object",
      properties: {
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 20,
          description: "Image IDs to enhance (max 20).",
        },
        tier: {
          type: "string",
          enum: ["FREE", "TIER_1K", "TIER_2K", "TIER_4K"],
          description: "Enhancement tier. FREE=0 credits, TIER_1K=2, TIER_2K=5, TIER_4K=10.",
        },
      },
      required: ["image_ids", "tier"],
    },
  },
  {
    name: "batch_enhance_cost_preview",
    description:
      "Preview the credit cost for a batch enhancement without starting it. Shows per-image and total cost, and whether you have enough credits.",
    category: "batch-enhance",
    inputSchema: {
      type: "object",
      properties: {
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 20,
          description: "Image IDs to preview cost for (max 20).",
        },
        tier: {
          type: "string",
          enum: ["FREE", "TIER_1K", "TIER_2K", "TIER_4K"],
          description: "Enhancement tier to preview.",
        },
      },
      required: ["image_ids", "tier"],
    },
  },
  {
    name: "batch_enhance_status",
    description: "Check the enhancement status for a set of images. Shows the most recent job for each image.",
    category: "batch-enhance",
    inputSchema: {
      type: "object",
      properties: {
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 50,
          description: "Image IDs from the batch to check status for.",
        },
      },
      required: ["image_ids"],
    },
  },

  // ── pipelines ──
  {
    name: "pipelines_list",
    description: "List enhancement pipelines accessible to user (own pipelines, public, and system defaults).",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Max results (default 50).",
        },
      },
      required: [],
    },
  },
  {
    name: "pipelines_create",
    description: "Create a new enhancement pipeline with optional analysis, auto-crop, prompt, and generation configs.",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 100, description: "Pipeline name." },
        description: { type: "string", description: "Pipeline description." },
        configs: {
          type: "object",
          properties: {
            analysis: { type: "object", description: "Analysis configuration." },
            autoCrop: { type: "object", description: "Auto-crop configuration." },
            prompt: { type: "object", description: "Prompt configuration." },
            generation: { type: "object", description: "Generation configuration." },
          },
          description: "Pipeline configuration objects.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "pipelines_get",
    description: "Get detailed information about a specific pipeline.",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        pipeline_id: { type: "string", minLength: 1, description: "Pipeline ID." },
      },
      required: ["pipeline_id"],
    },
  },
  {
    name: "pipelines_update",
    description: "Update a pipeline's name, description, or configuration. Only the owner can update.",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        pipeline_id: { type: "string", minLength: 1, description: "Pipeline ID to update." },
        name: { type: "string", minLength: 1, maxLength: 100, description: "New name." },
        description: { type: "string", description: "New description." },
        configs: {
          type: "object",
          properties: {
            analysis: { type: "object", description: "Analysis configuration." },
            autoCrop: { type: "object", description: "Auto-crop configuration." },
            prompt: { type: "object", description: "Prompt configuration." },
            generation: { type: "object", description: "Generation configuration." },
          },
          description: "Updated pipeline configuration objects.",
        },
      },
      required: ["pipeline_id"],
    },
  },
  {
    name: "pipelines_delete",
    description: "Delete a pipeline. Only the owner can delete. Fails if pipeline is used by albums.",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        pipeline_id: { type: "string", minLength: 1, description: "Pipeline ID to delete." },
      },
      required: ["pipeline_id"],
    },
  },
  {
    name: "pipelines_fork",
    description: "Fork (copy) a pipeline to your account. Works on own, public, or system default pipelines.",
    category: "pipelines",
    inputSchema: {
      type: "object",
      properties: {
        pipeline_id: { type: "string", minLength: 1, description: "Pipeline ID to fork." },
      },
      required: ["pipeline_id"],
    },
  },
];

// Build lookup
const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();

    if (body.method === "list_tools") {
      return Response.json({ tools: TOOLS });
    }

    if (body.method === "call_tool") {
      const { toolName, args, userId } = body;
      const tool = TOOL_MAP.get(toolName);
      if (!tool) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
            isError: true,
          },
        });
      }

      // Proxy to Next.js backend
      try {
        const nextUrl = env.NEXT_APP_URL || "https://spike.land";
        const response = await fetch(`${nextUrl}/api/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-mcp-user-id": userId || "",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: toolName, arguments: args || {} },
          }),
        });
        const data = await response.json();
        return Response.json({ result: data.result || data });
      } catch (err) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Error calling ${toolName}: ${err.message}` }],
            isError: true,
          },
        });
      }
    }

    return Response.json({ error: "Unknown method" }, { status: 400 });
  },
};
