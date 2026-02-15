// MCP Domain Worker: Agents
// Handles: agents, swarm, capabilities, jules, skill-store, tool-factory

const TOOLS = [
  // ── Agent Management Tools ──
  {
    name: "agents_list",
    description: "List your connected agents with status and stats.",
    category: "agents",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "agents_get",
    description: "Get detailed information about a specific agent.",
    category: "agents",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "agents_get_queue",
    description: "Get unread messages queued for an agent.",
    category: "agents",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID to check queue for." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "agents_send_message",
    description: "Send a message to an agent.",
    category: "agents",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID to send message to." },
        content: { type: "string", description: "Message content (max 10000 chars)." },
      },
      required: ["agent_id", "content"],
    },
  },
  // ── Swarm Tools ──
  {
    name: "swarm_list_agents",
    description: "List all AI agents with their status, tasks, and session info.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "idle", "stopped", "all"], description: "Filter by agent status." },
        limit: { type: "number", description: "Max results." },
      },
      required: [],
    },
  },
  {
    name: "swarm_get_agent",
    description: "Get detailed information about a specific agent including messages and audit log.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "swarm_spawn_agent",
    description: "Register a new agent in the swarm.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "Agent display name." },
        machine_id: { type: "string", description: "Machine identifier." },
        session_id: { type: "string", description: "Session identifier." },
        project_path: { type: "string", description: "Project path." },
      },
      required: ["display_name", "machine_id", "session_id"],
    },
  },
  {
    name: "swarm_stop_agent",
    description: "Stop an agent by soft-deleting it.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID to stop." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "swarm_redirect_agent",
    description: "Redirect an agent to a different project or working directory.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID." },
        project_path: { type: "string", description: "New project path." },
        working_directory: { type: "string", description: "New working directory." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "swarm_broadcast",
    description: "Broadcast a message to all active agents.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Message content." },
      },
      required: ["content"],
    },
  },
  {
    name: "swarm_agent_timeline",
    description: "Get an agent's activity timeline from the audit log.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID." },
        limit: { type: "number", description: "Max entries." },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "swarm_topology",
    description: "Get the swarm topology showing agent relationships and trust scores.",
    category: "swarm",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Capabilities Tools ──
  {
    name: "capabilities_request_permissions",
    description: "Request additional tool or category permissions. Creates an approval request for the user.",
    category: "capabilities",
    inputSchema: {
      type: "object",
      properties: {
        tools: { type: "array", items: { type: "string" }, description: "Specific tool names to request access to." },
        categories: { type: "array", items: { type: "string" }, description: "Tool categories to request access to." },
        reason: { type: "string", description: "Why access is needed." },
      },
      required: ["reason"],
    },
  },
  {
    name: "capabilities_check_permissions",
    description: "Check current capability token scope, budget remaining, and trust level.",
    category: "capabilities",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "capabilities_list_queued_actions",
    description: "List pending permission requests and their status.",
    category: "capabilities",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status: PENDING, APPROVED, DENIED, EXPIRED." },
      },
      required: [],
    },
  },
  // ── Jules Tools ──
  {
    name: "jules_list_sessions",
    description: "List all Jules coding sessions with their current status.",
    category: "jules",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["QUEUED", "PLANNING", "AWAITING_PLAN_APPROVAL", "IN_PROGRESS", "COMPLETED", "FAILED"], description: "Filter by session status." },
        page_size: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "jules_create_session",
    description: "Create a new Jules coding task for async implementation.",
    category: "jules",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Session title." },
        task: { type: "string", description: "Task description (max 4000 chars)." },
        source_repo: { type: "string", description: "GitHub repo (e.g. owner/repo)." },
        starting_branch: { type: "string", description: "Starting branch (default: main)." },
      },
      required: ["title", "task"],
    },
  },
  {
    name: "jules_get_session",
    description: "Get details and activities for a Jules session.",
    category: "jules",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Jules session ID." },
        include_activities: { type: "boolean", description: "Include activity feed (default true)." },
      },
      required: ["session_id"],
    },
  },
  {
    name: "jules_approve_plan",
    description: "Approve the implementation plan for a Jules session.",
    category: "jules",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Jules session ID." },
      },
      required: ["session_id"],
    },
  },
  {
    name: "jules_send_message",
    description: "Send a message to an active Jules session.",
    category: "jules",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Jules session ID." },
        message: { type: "string", description: "Message to send (max 4000 chars)." },
      },
      required: ["session_id", "message"],
    },
  },
  // ── Skill Store Tools ──
  {
    name: "skill_store_list",
    description: "List published skills from the skill store with optional category and search filters.",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["QUALITY", "TESTING", "WORKFLOW", "SECURITY", "PERFORMANCE", "OTHER"], description: "Filter by skill category." },
        search: { type: "string", description: "Search skills by name, display name, or description." },
        limit: { type: "number", description: "Max results (default 20)." },
        offset: { type: "number", description: "Offset for pagination (default 0)." },
      },
      required: [],
    },
  },
  {
    name: "skill_store_get",
    description: "Get detailed information about a specific skill by slug or ID.",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "Skill slug or ID." },
      },
      required: ["identifier"],
    },
  },
  {
    name: "skill_store_install",
    description: "Install a skill from the store. Records the installation and increments the install count.",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "string", description: "Skill ID to install." },
      },
      required: ["skill_id"],
    },
  },
  {
    name: "skill_store_admin_list",
    description: "List all skills including drafts and archived (admin). Shows status, active, and featured flags.",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Filter by skill status." },
        limit: { type: "number", description: "Max results (default 20)." },
        offset: { type: "number", description: "Offset for pagination (default 0)." },
      },
      required: [],
    },
  },
  {
    name: "skill_store_admin_create",
    description: "Create a new skill in the store (admin).",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Unique skill name (slug-style, lowercase alphanumeric with hyphens)." },
        slug: { type: "string", description: "URL-friendly slug." },
        displayName: { type: "string", description: "Human-readable display name." },
        description: { type: "string", description: "Short description." },
        longDescription: { type: "string", description: "Extended description." },
        category: { type: "string", enum: ["QUALITY", "TESTING", "WORKFLOW", "SECURITY", "PERFORMANCE", "OTHER"], description: "Skill category." },
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Initial status." },
        version: { type: "string", description: "Version string." },
        author: { type: "string", description: "Author name." },
        authorUrl: { type: "string", description: "Author URL." },
        repoUrl: { type: "string", description: "Repository URL." },
        iconUrl: { type: "string", description: "Icon URL." },
        color: { type: "string", description: "Theme color (hex, e.g. #FF0000)." },
        tags: { type: "array", items: { type: "string" }, description: "Tags for search/filtering." },
        sortOrder: { type: "number", description: "Sort order (lower = first)." },
        isActive: { type: "boolean", description: "Whether skill is active." },
        isFeatured: { type: "boolean", description: "Whether skill is featured." },
      },
      required: ["name", "slug", "displayName", "description", "author"],
    },
  },
  {
    name: "skill_store_admin_update",
    description: "Update fields of an existing skill (admin).",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "string", description: "Skill ID to update." },
        name: { type: "string", description: "New name." },
        slug: { type: "string", description: "New slug." },
        displayName: { type: "string", description: "New display name." },
        description: { type: "string", description: "New description." },
        longDescription: { type: "string", description: "New long description." },
        category: { type: "string", enum: ["QUALITY", "TESTING", "WORKFLOW", "SECURITY", "PERFORMANCE", "OTHER"], description: "New category." },
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "New status." },
        version: { type: "string", description: "New version." },
        author: { type: "string", description: "New author." },
        tags: { type: "array", items: { type: "string" }, description: "New tags." },
        isActive: { type: "boolean", description: "New active status." },
        isFeatured: { type: "boolean", description: "New featured status." },
      },
      required: ["skill_id"],
    },
  },
  {
    name: "skill_store_admin_delete",
    description: "Archive a skill (soft-delete). Sets status to ARCHIVED and isActive to false.",
    category: "skill-store",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "string", description: "Skill ID to archive." },
      },
      required: ["skill_id"],
    },
  },
  // ── Tool Factory Tools ──
  {
    name: "register_tool",
    description: "Register a custom tool with a declarative HTTP proxy handler. Use {{secrets.KEY}} to reference vault secrets and {{input.FIELD}} for user inputs.",
    category: "tool-factory",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tool name (lowercase, start with letter, letters/numbers/underscores only)." },
        description: { type: "string", description: "Tool description (max 500 chars)." },
        input_schema: { type: "object", description: "JSON Schema for tool inputs." },
        handler_spec: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL (HTTPS only)." },
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method." },
            headers: { type: "object", description: "Headers (supports template variables)." },
            body: { type: "string", description: "Request body template." },
            responseTransform: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["json_path"] },
                path: { type: "string" },
              },
            },
          },
          required: ["url", "method"],
        },
      },
      required: ["name", "description", "handler_spec"],
    },
  },
  {
    name: "test_tool",
    description: "Execute a registered tool with test inputs. Only works with DRAFT or PUBLISHED tools.",
    category: "tool-factory",
    inputSchema: {
      type: "object",
      properties: {
        tool_id: { type: "string", description: "Tool ID to test." },
        test_input: { type: "object", description: "Test input data." },
      },
      required: ["tool_id"],
    },
  },
  {
    name: "publish_tool",
    description: "Publish a draft tool to make it available for use.",
    category: "tool-factory",
    inputSchema: {
      type: "object",
      properties: {
        tool_id: { type: "string", description: "Tool ID to publish." },
      },
      required: ["tool_id"],
    },
  },
  {
    name: "list_registered_tools",
    description: "List all tools registered by the current user.",
    category: "tool-factory",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "disable_tool",
    description: "Disable a registered tool.",
    category: "tool-factory",
    inputSchema: {
      type: "object",
      properties: {
        tool_id: { type: "string", description: "Tool ID to disable." },
      },
      required: ["tool_id"],
    },
  },
];

// Build lookup
const TOOL_MAP = new Map(TOOLS.map(t => [t.name, t]));

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
