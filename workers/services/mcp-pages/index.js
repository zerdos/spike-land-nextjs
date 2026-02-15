// MCP Domain Worker: Pages
// Handles: pages, blocks, page-ai

const TOOLS = [
  // ── pages ──
  {
    name: "pages_create",
    description: "Create a new dynamic page with a slug, title, layout, and optional theme data.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, description: "URL slug for the page." },
        title: { type: "string", minLength: 1, description: "Page title." },
        description: { type: "string", description: "Page description." },
        layout: {
          type: "string",
          enum: ["LANDING", "FEATURE", "STORE", "DASHBOARD", "ARTICLE", "GALLERY", "CUSTOM"],
          default: "LANDING",
          description: "Page layout type.",
        },
        themeData: { type: "object", description: "Theme configuration data." },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorisation." },
        customCss: { type: "string", description: "Custom CSS for the page." },
      },
      required: ["slug", "title"],
    },
  },
  {
    name: "pages_get",
    description: "Get a dynamic page by slug or page ID.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Page slug to look up." },
        pageId: { type: "string", description: "Page ID to look up." },
      },
      required: [],
    },
  },
  {
    name: "pages_list",
    description: "List dynamic pages with optional status, layout, and search filters.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
          description: "Filter by page status.",
        },
        layout: {
          type: "string",
          enum: ["LANDING", "FEATURE", "STORE", "DASHBOARD", "ARTICLE", "GALLERY", "CUSTOM"],
          description: "Filter by page layout.",
        },
        search: { type: "string", description: "Search title and description." },
        page: { type: "number", minimum: 1, default: 1, description: "Page number (default 1)." },
        pageSize: { type: "number", minimum: 1, maximum: 100, default: 20, description: "Results per page (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "pages_update",
    description: "Update a dynamic page's title, description, layout, theme, tags, CSS, or SEO fields.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "ID of the page to update." },
        title: { type: "string", minLength: 1, description: "New title." },
        description: { type: "string", description: "New description." },
        layout: {
          type: "string",
          enum: ["LANDING", "FEATURE", "STORE", "DASHBOARD", "ARTICLE", "GALLERY", "CUSTOM"],
          description: "New layout.",
        },
        themeData: { type: "object", description: "New theme data." },
        tags: { type: "array", items: { type: "string" }, description: "New tags." },
        customCss: { type: "string", description: "New custom CSS." },
        seoTitle: { type: "string", description: "SEO title override." },
        seoDescription: { type: "string", description: "SEO description override." },
        ogImageUrl: { type: "string", description: "Open Graph image URL." },
      },
      required: ["pageId"],
    },
  },
  {
    name: "pages_delete",
    description: "Archive a dynamic page (soft delete).",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "ID of the page to archive." },
      },
      required: ["pageId"],
    },
  },
  {
    name: "pages_publish",
    description: "Publish a draft page, making it publicly accessible.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "ID of the page to publish." },
      },
      required: ["pageId"],
    },
  },
  {
    name: "pages_clone",
    description: "Clone a page and all its blocks to create a copy.",
    category: "pages",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "ID of the source page to clone." },
        newSlug: { type: "string", description: "Slug for the cloned page (auto-generated if omitted)." },
      },
      required: ["pageId"],
    },
  },

  // ── blocks ──
  {
    name: "blocks_add",
    description: "Add a new block to a dynamic page. Content is validated against the block type schema.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", minLength: 1, description: "ID of the DynamicPage to add the block to." },
        blockType: {
          type: "string",
          enum: [
            "HERO", "FEATURE_GRID", "FEATURE_LIST", "CTA", "TESTIMONIALS",
            "PRICING", "STATS", "GALLERY", "FAQ", "FOOTER",
            "COMPARISON_TABLE", "APP_GRID", "MARKDOWN", "CUSTOM_REACT",
          ],
          description: "Type of block to add.",
        },
        content: { type: "object", description: "Block content (validated against the block type schema)." },
        variant: { type: "string", description: "Optional visual variant for the block." },
        sortOrder: { type: "number", description: "Position in the page. Auto-assigned if omitted." },
        isVisible: { type: "boolean", default: true, description: "Whether the block is visible on the page." },
      },
      required: ["pageId", "blockType", "content"],
    },
  },
  {
    name: "blocks_update",
    description: "Update an existing page block's content, variant, or visibility.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {
        blockId: { type: "string", minLength: 1, description: "ID of the PageBlock to update." },
        content: { type: "object", description: "Updated block content (validated against block type schema)." },
        variant: { type: "string", description: "Updated visual variant." },
        isVisible: { type: "boolean", description: "Updated visibility." },
      },
      required: ["blockId"],
    },
  },
  {
    name: "blocks_delete",
    description: "Delete a page block.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {
        blockId: { type: "string", minLength: 1, description: "ID of the PageBlock to delete." },
      },
      required: ["blockId"],
    },
  },
  {
    name: "blocks_reorder",
    description: "Reorder blocks within a page by providing the new block ID order.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", minLength: 1, description: "ID of the DynamicPage." },
        blockIds: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Ordered array of block IDs defining the new sort order.",
        },
      },
      required: ["pageId", "blockIds"],
    },
  },
  {
    name: "blocks_list_types",
    description: "List all available block types with their descriptions and content schemas.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "blocks_get",
    description: "Get a specific page block by ID with its content and metadata.",
    category: "blocks",
    inputSchema: {
      type: "object",
      properties: {
        blockId: { type: "string", minLength: 1, description: "ID of the PageBlock to retrieve." },
      },
      required: ["blockId"],
    },
  },

  // ── page-ai ──
  {
    name: "page_ai_generate",
    description: "Generate a complete page with blocks from a text prompt using AI.",
    category: "page-ai",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", minLength: 1, description: "Description of the page to generate." },
        slug: { type: "string", minLength: 1, description: "URL slug for the page (auto-generated from prompt if omitted)." },
        layout: {
          type: "string",
          enum: ["LANDING", "FEATURE", "STORE", "DASHBOARD", "ARTICLE", "GALLERY", "CUSTOM"],
          description: "Page layout type. Defaults to LANDING.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "page_ai_enhance_block",
    description: "Enhance a page block's content using AI based on an instruction.",
    category: "page-ai",
    inputSchema: {
      type: "object",
      properties: {
        blockId: { type: "string", minLength: 1, description: "ID of the PageBlock to enhance." },
        instruction: { type: "string", minLength: 1, description: "How to improve the block content." },
      },
      required: ["blockId", "instruction"],
    },
  },
  {
    name: "page_ai_suggest_layout",
    description: "Get AI-suggested page layout and block structure for a use case.",
    category: "page-ai",
    inputSchema: {
      type: "object",
      properties: {
        useCase: { type: "string", minLength: 1, description: "Description of what the page is for." },
      },
      required: ["useCase"],
    },
  },
  {
    name: "page_ai_generate_theme",
    description: "Generate a theme configuration based on a brand description and optional color/style preferences.",
    category: "page-ai",
    inputSchema: {
      type: "object",
      properties: {
        brandDescription: { type: "string", minLength: 1, description: "Description of the brand identity." },
        primaryColor: { type: "string", description: "Primary brand color in hex format (e.g. '#3B82F6')." },
        style: {
          type: "string",
          enum: ["modern", "minimal", "bold", "playful"],
          description: "Visual style preset. Defaults to 'modern'.",
        },
      },
      required: ["brandDescription"],
    },
  },
  {
    name: "page_ai_populate_store",
    description: "Populate a store page with app entries from the platform.",
    category: "page-ai",
    inputSchema: {
      type: "object",
      properties: {
        pageSlug: { type: "string", minLength: 1, description: "Slug of the target page to populate with app entries." },
      },
      required: ["pageSlug"],
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
