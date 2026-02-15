// MCP Domain Worker: Apps
// Handles: apps, create, codespace, arena

const TOOLS = [
  // ── apps ──
  {
    name: "apps_create",
    description:
      "Create a new app from a text prompt. This is the STARTING POINT for new apps — " +
      "do NOT use codespace_update to create apps. The AI will generate code based on your prompt.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "What the app should do. Be specific about features, layout, and behavior.",
        },
        codespace_id: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          pattern: "^[a-zA-Z0-9_.-]+$",
          description: "Custom codespace ID (slug). Auto-generated if omitted.",
        },
        image_ids: {
          type: "array",
          items: { type: "string" },
          maxItems: 5,
          description: "Image IDs to attach as references.",
        },
        template_id: {
          type: "string",
          description: "Start from a template. Use apps_list to discover available templates.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "apps_list",
    description:
      "List your apps. Call this FIRST to see what exists before making changes. " +
      "Returns app IDs needed for all other apps_* tools.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PROMPTING", "WAITING", "DRAFTING", "BUILDING", "FINE_TUNING", "TEST", "LIVE", "FAILED"],
          description: "Filter by status. Omit to see all active apps (excludes ARCHIVED).",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 50,
          default: 20,
          description: "Max apps to return. Default: 20.",
        },
      },
      required: [],
    },
  },
  {
    name: "apps_get",
    description:
      "Get full app details including current code and status. Read before editing. " +
      "Returns the current code version, messages count, and agent activity status.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: {
          type: "string",
          minLength: 1,
          description: "App identifier: codespace ID, slug, or database ID.",
        },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_chat",
    description:
      "Send a message to iterate on an existing app. PREFERRED over direct code edits — " +
      "the AI understands the app's context and will make targeted changes.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
        message: {
          type: "string",
          minLength: 1,
          maxLength: 10000,
          description: "Your message to iterate on the app.",
        },
        image_ids: {
          type: "array",
          items: { type: "string" },
          maxItems: 5,
          description: "Image IDs to attach as references.",
        },
      },
      required: ["app_id", "message"],
    },
  },
  {
    name: "apps_get_messages",
    description: "Get chat history for an app. Shows the conversation between user and AI agent.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
        cursor: { type: "string", description: "Cursor for pagination. Omit for most recent messages." },
        limit: { type: "number", minimum: 1, maximum: 50, default: 20, description: "Max messages. Default: 20." },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_set_status",
    description:
      "Change app status. WARNING: ARCHIVED stops the live app and removes it from active list. " +
      "Use PROMPTING to reset an app back to draft state.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
        status: {
          type: "string",
          enum: ["ARCHIVED", "PROMPTING"],
          description: "ARCHIVED stops the live app. PROMPTING resets to draft state.",
        },
      },
      required: ["app_id", "status"],
    },
  },
  {
    name: "apps_bin",
    description:
      "Soft-delete app to recycle bin. Recoverable for 30 days. " +
      "For temporary deactivation, use apps_set_status with ARCHIVED instead.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_restore",
    description: "Restore an app from the recycle bin.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_delete_permanent",
    description:
      "PERMANENTLY delete an app. CANNOT be undone. The app must already be in the bin. " +
      "Requires confirm=true as a safety check.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier. Must already be in the bin." },
        confirm: { type: "boolean", description: "Must be true. This action CANNOT be undone." },
      },
      required: ["app_id", "confirm"],
    },
  },
  {
    name: "apps_list_versions",
    description:
      "List code versions (immutable snapshots) for an app. " +
      "Each version is created when the AI agent updates the code.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
        limit: { type: "number", minimum: 1, maximum: 50, default: 10, description: "Max versions. Default: 10." },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_batch_status",
    description: "Set status on multiple apps at once. Useful for bulk archiving or reactivating apps.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 20,
          description: "List of app identifiers.",
        },
        status: {
          type: "string",
          enum: ["ARCHIVED", "PROMPTING"],
          description: "Target status for all apps.",
        },
      },
      required: ["app_ids", "status"],
    },
  },
  {
    name: "apps_clear_messages",
    description: "Clear all messages in an app's chat history. This action cannot be undone.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
      },
      required: ["app_id"],
    },
  },
  {
    name: "apps_upload_images",
    description: "Get instructions for uploading images to an app. Returns the upload endpoint and requirements.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", minLength: 1, description: "App identifier." },
        image_count: { type: "number", minimum: 1, maximum: 5, description: "Number of images to upload (max 5)." },
      },
      required: ["app_id", "image_count"],
    },
  },
  {
    name: "apps_generate_codespace_id",
    description:
      "Generate a random codespace ID in the format 'adjective.noun.verb.suffix'. Useful for creating unique app identifiers.",
    category: "apps",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── create ──
  {
    name: "create_search_apps",
    description: "Search published /create apps by title, description, or slug. Results are ordered by popularity.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, description: "Search query to match against app title, description, or slug." },
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "create_get_app",
    description: "Get full details for a specific /create app by its slug, including the prompt used to generate it.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, description: "Unique slug of the created app." },
      },
      required: ["slug"],
    },
  },
  {
    name: "create_classify_idea",
    description: "Classify an app idea into a URL slug and category using AI. Returns status, slug, category, and reason.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, maxLength: 2000, description: "App idea text to classify." },
      },
      required: ["text"],
    },
  },
  {
    name: "create_check_health",
    description: "Check if a codespace is healthy (has real, non-default content). Returns true/false.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, description: "Codespace ID to check health for." },
      },
      required: ["codespace_id"],
    },
  },
  {
    name: "create_list_top_apps",
    description: "List the most popular published /create apps by view count. Only healthy codespaces are included.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max results (default 10)." },
      },
      required: [],
    },
  },
  {
    name: "create_list_recent_apps",
    description: "List the most recently generated published /create apps. Only healthy codespaces are included.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 50, description: "Max results (default 10)." },
      },
      required: [],
    },
  },
  {
    name: "create_get_app_status",
    description: "Quick status check for a /create app. Returns GENERATING, PUBLISHED, or FAILED with the codespace URL.",
    category: "create",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, description: "Unique slug of the created app." },
      },
      required: ["slug"],
    },
  },

  // ── codespace ──
  {
    name: "codespace_update",
    description:
      "Create or update a live React application on testing.spike.land.\n" +
      "The app is available at: https://testing.spike.land/live/{codespace_id}",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9_.-]+$", description: "Codespace identifier." },
        code: { type: "string", minLength: 1, description: "React source code." },
        run: { type: "boolean", default: true, description: "Whether to run after updating." },
      },
      required: ["codespace_id", "code"],
    },
  },
  {
    name: "codespace_run",
    description: "Transpile and render a codespace without updating code.",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9_.-]+$", description: "Codespace identifier." },
      },
      required: ["codespace_id"],
    },
  },
  {
    name: "codespace_screenshot",
    description: "Get a JPEG screenshot of a running codespace.",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9_.-]+$", description: "Codespace identifier." },
      },
      required: ["codespace_id"],
    },
  },
  {
    name: "codespace_get",
    description: "Get the current code and session data for a codespace.",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9_.-]+$", description: "Codespace identifier." },
      },
      required: ["codespace_id"],
    },
  },
  {
    name: "codespace_link_app",
    description: "Link a codespace to the user's my-apps on spike.land.",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {
        codespace_id: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9_.-]+$", description: "Codespace identifier." },
        app_id: { type: "string", description: "Existing app ID to link to." },
        app_name: { type: "string", minLength: 3, maxLength: 50, description: "Name for new app (if no app_id)." },
        app_description: { type: "string", minLength: 10, maxLength: 500, description: "Description for new app." },
      },
      required: ["codespace_id"],
    },
  },
  {
    name: "codespace_list_my_apps",
    description: "List the user's apps from spike.land.",
    category: "codespace",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── arena ──
  {
    name: "arena_list_challenges",
    description: "List open arena challenges for the AI Prompt Arena. Returns challenges with difficulty, category, and submission counts.",
    category: "arena",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["OPEN", "CLOSED", "ARCHIVED"],
          default: "OPEN",
          description: "Filter by challenge status.",
        },
        category: { type: "string", description: "Filter by category." },
        limit: { type: "number", minimum: 1, maximum: 50, default: 20, description: "Maximum results." },
      },
      required: [],
    },
  },
  {
    name: "arena_get_challenge_details",
    description: "Get full details of an arena challenge including submissions and review status.",
    category: "arena",
    inputSchema: {
      type: "object",
      properties: {
        challenge_id: { type: "string", minLength: 1, description: "The challenge ID." },
      },
      required: ["challenge_id"],
    },
  },
  {
    name: "arena_submit_prompt",
    description:
      "Submit a prompt to an arena challenge. The system will generate code, transpile, and validate it. Returns a submission ID for tracking.",
    category: "arena",
    inputSchema: {
      type: "object",
      properties: {
        challenge_id: { type: "string", minLength: 1, description: "The challenge ID." },
        prompt: { type: "string", minLength: 10, maxLength: 10000, description: "The prompt to generate code from." },
        system_prompt: { type: "string", maxLength: 5000, description: "Optional custom system prompt." },
      },
      required: ["challenge_id", "prompt"],
    },
  },
  {
    name: "arena_review_submission",
    description:
      "Review an arena submission. Report bugs, score quality (0-1), and approve/reject. Two reviews trigger automatic scoring.",
    category: "arena",
    inputSchema: {
      type: "object",
      properties: {
        submission_id: { type: "string", minLength: 1, description: "The submission ID to review." },
        bugs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Bug description." },
              severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Bug severity." },
              line: { type: "number", description: "Line number if applicable." },
            },
            required: ["description", "severity"],
          },
          default: [],
          description: "List of bugs found.",
        },
        score: { type: "number", minimum: 0, maximum: 1, description: "Quality score from 0 to 1." },
        approved: { type: "boolean", description: "Whether to approve the submission." },
        comment: { type: "string", maxLength: 2000, description: "Review comment." },
      },
      required: ["submission_id", "score", "approved"],
    },
  },
  {
    name: "arena_get_leaderboard",
    description: "Get the arena ELO leaderboard showing top-ranked prompt engineers.",
    category: "arena",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 50, default: 20, description: "Number of entries to return." },
      },
      required: [],
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
