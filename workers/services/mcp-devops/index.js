// MCP Domain Worker: DevOps
// Handles: dev, gateway, github-admin, sentry, vercel, workflows, audit, reports, mcp-registry

const TOOLS = [
  // ── Dev Workflow Tools ──
  {
    name: "dev_logs",
    description: "Read dev server logs. Returns the last N lines, optionally filtered by search term.",
    category: "dev",
    inputSchema: {
      type: "object",
      properties: {
        lines: { type: "number", description: "Number of lines to return (default 100)" },
        search: { type: "string", description: "Filter lines containing this text" },
      },
      required: [],
    },
  },
  {
    name: "dev_status",
    description: "Get dev server status: PID, uptime, port, current git commit.",
    category: "dev",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "github_status",
    description: "Get current git branch, commit, recent history, and CI status.",
    category: "dev",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "file_guard",
    description: "Pre-check if file changes will break tests. Runs vitest --changed against the specified commit.",
    category: "dev",
    inputSchema: {
      type: "object",
      properties: {
        commit_hash: { type: "string", description: "Base commit hash to diff against (default: HEAD~1)" },
      },
      required: [],
    },
  },
  {
    name: "notify_agent",
    description: "Send a dev workflow notification. Notifications are stored locally and can be read by other agents.",
    category: "dev",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event type (e.g., 'test_failure', 'build_complete', 'file_guard_fail')" },
        message: { type: "string", description: "Notification message" },
        severity: { type: "string", enum: ["info", "warning", "error"], description: "Severity level (default: info)" },
      },
      required: ["event", "message"],
    },
  },
  // ── Gateway / BridgeMind Tools ──
  {
    name: "bridgemind_list_tasks",
    description: "List tasks from the BridgeMind project board. Filter by status or sprint.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by task status" },
        sprint_id: { type: "string", description: "Filter by sprint ID" },
        limit: { type: "number", description: "Max items to return" },
      },
      required: [],
    },
  },
  {
    name: "bridgemind_create_task",
    description: "Create a new task on the BridgeMind project board.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Task priority" },
        labels: { type: "array", items: { type: "string" }, description: "Task labels" },
        sprint_id: { type: "string", description: "Sprint to add task to" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "bridgemind_update_task",
    description: "Update an existing task on the BridgeMind board.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: { type: "string", description: "New status" },
        priority: { type: "string", description: "New priority" },
        labels: { type: "array", items: { type: "string" }, description: "New labels" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "bridgemind_get_knowledge",
    description: "Search the BridgeMind knowledge base for relevant information.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for knowledge base" },
      },
      required: ["query"],
    },
  },
  {
    name: "bridgemind_add_knowledge",
    description: "Add a new entry to the BridgeMind knowledge base.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Knowledge entry title" },
        content: { type: "string", description: "Knowledge content" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "bridgemind_list_sprints",
    description: "List all sprints from BridgeMind.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Gateway / GitHub Projects Tools ──
  {
    name: "github_list_issues",
    description: "List issues from GitHub Projects V2 (read-only mirror of BridgeMind board).",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by project item status" },
        first: { type: "number", description: "Number of items to return" },
      },
      required: [],
    },
  },
  {
    name: "github_create_issue",
    description: "Create a new GitHub issue (for mirroring BridgeMind tasks).",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body in markdown" },
        labels: { type: "array", items: { type: "string" }, description: "Labels to apply" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "github_update_project_item",
    description: "Update a field value on a GitHub Projects V2 item.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "Project item ID" },
        field_id: { type: "string", description: "Field ID to update" },
        value: { type: "string", description: "New value for the field" },
      },
      required: ["item_id", "field_id", "value"],
    },
  },
  {
    name: "github_get_pr_status",
    description: "Get PR and CI status for a GitHub issue.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        issue_number: { type: "number", description: "GitHub issue number" },
      },
      required: ["issue_number"],
    },
  },
  // ── Gateway / Sync Tools ──
  {
    name: "sync_bridgemind_to_github",
    description: "Sync BridgeMind board items to GitHub Projects V2 (one-way: BridgeMind -> GitHub).",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: { type: "boolean", description: "Preview changes without applying" },
      },
      required: [],
    },
  },
  {
    name: "sync_status",
    description: "Get the current sync status between BridgeMind and GitHub.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Gateway / Bolt Tools ──
  {
    name: "bolt_status",
    description: "Get the current Bolt orchestrator status, including active tasks and health.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "bolt_pause",
    description: "Pause the Bolt orchestrator. Active tasks continue but no new ones are started.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "bolt_resume",
    description: "Resume the Bolt orchestrator after a pause.",
    category: "gateway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── GitHub Admin Tools ──
  {
    name: "github_admin_roadmap",
    description: "Get roadmap items from GitHub Projects V2. Requires GH_PAT_TOKEN.",
    category: "github-admin",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "github_admin_issues_summary",
    description: "Summarize open/closed issues with label breakdown and recent activity.",
    category: "github-admin",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "github_admin_pr_status",
    description: "Get PR status overview: open, merged, and pending PRs with CI status.",
    category: "github-admin",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Sentry Bridge Tools ──
  {
    name: "sentry_issues",
    description: "List recent Sentry issues for the project. Requires SENTRY_MCP_AUTH_TOKEN.",
    category: "sentry",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for filtering issues" },
        limit: { type: "number", description: "Max issues to return (default 25)" },
      },
      required: [],
    },
  },
  {
    name: "sentry_issue_detail",
    description: "Get detailed information about a specific Sentry issue.",
    category: "sentry",
    inputSchema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Sentry issue ID" },
      },
      required: ["issue_id"],
    },
  },
  {
    name: "sentry_stats",
    description: "Get project error statistics from Sentry.",
    category: "sentry",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Vercel Bridge Tools ──
  {
    name: "vercel_deployments",
    description: "List recent Vercel deployments. Requires VERCEL_TOKEN.",
    category: "vercel",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max deployments to return (default 20)" },
        state: { type: "string", description: "Filter by deployment state (e.g. READY, ERROR, BUILDING)" },
      },
      required: [],
    },
  },
  {
    name: "vercel_deployment_detail",
    description: "Get detailed information about a specific Vercel deployment.",
    category: "vercel",
    inputSchema: {
      type: "object",
      properties: {
        deployment_id: { type: "string", description: "Vercel deployment UID" },
      },
      required: ["deployment_id"],
    },
  },
  {
    name: "vercel_analytics",
    description: "Get Vercel analytics data (page views, visitors, bounce rate).",
    category: "vercel",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Workflow Tools ──
  {
    name: "workflow_create",
    description: "Create a new workflow with steps and a trigger type.",
    category: "workflows",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        name: { type: "string", description: "Workflow name." },
        description: { type: "string", description: "Workflow description." },
        trigger_type: { type: "string", description: "Trigger type (e.g. manual, schedule, webhook)." },
        steps: { type: "string", description: "JSON array of step definitions." },
      },
      required: ["workspace_slug", "name", "trigger_type", "steps"],
    },
  },
  {
    name: "workflow_run",
    description: "Trigger a workflow run with optional input data.",
    category: "workflows",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        workflow_id: { type: "string", description: "Workflow ID to execute." },
        input: { type: "string", description: "JSON input data for the workflow run." },
      },
      required: ["workspace_slug", "workflow_id"],
    },
  },
  {
    name: "workflow_get_status",
    description: "Get the status of a workflow run including step progress.",
    category: "workflows",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        run_id: { type: "string", description: "Workflow run ID." },
      },
      required: ["workspace_slug", "run_id"],
    },
  },
  {
    name: "workflow_list",
    description: "List workflows in a workspace with run counts and latest status.",
    category: "workflows",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        limit: { type: "number", description: "Max workflows to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "workflow_get_logs",
    description: "Get execution logs for a workflow run with step-by-step details.",
    category: "workflows",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        run_id: { type: "string", description: "Workflow run ID." },
      },
      required: ["workspace_slug", "run_id"],
    },
  },
  // ── Audit Tools ──
  {
    name: "audit_query_logs",
    description: "Query workspace audit logs with optional filters for action and target type.",
    category: "audit",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        action: { type: "string", description: "Filter by action type." },
        target_type: { type: "string", description: "Filter by target type." },
        days: { type: "number", description: "Number of days to look back (default 7)." },
        limit: { type: "number", description: "Max records to return (default 50)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "audit_export",
    description: "Export audit logs for a date range as a JSON summary.",
    category: "audit",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        from_date: { type: "string", description: "Start date (ISO string)." },
        to_date: { type: "string", description: "End date (ISO string)." },
        format: { type: "string", description: "Export format (default json)." },
      },
      required: ["workspace_slug", "from_date", "to_date"],
    },
  },
  {
    name: "audit_get_ai_decisions",
    description: "Retrieve AI decision logs for the workspace.",
    category: "audit",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        days: { type: "number", description: "Number of days to look back (default 7)." },
        limit: { type: "number", description: "Max records to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "audit_get_agent_trail",
    description: "Retrieve agent activity audit trail.",
    category: "audit",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        agent_id: { type: "string", description: "Filter by agent ID." },
        limit: { type: "number", description: "Max records to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  // ── Reports Tools ──
  {
    name: "reports_generate_system",
    description: "Generate a system report with aggregated platform metrics.",
    category: "reports",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["7d", "30d", "90d"], description: "Report period." },
        sections: { type: "array", items: { type: "string", enum: ["platform", "users", "tokens", "health", "marketing", "errors", "vercel", "meta"] }, description: "Sections to include (default: all)." },
        format: { type: "string", enum: ["json", "markdown"], description: "Output format." },
      },
      required: [],
    },
  },
  // ── MCP Registry Tools ──
  {
    name: "mcp_registry_search",
    description: "Search across Smithery, Official MCP Registry, and Glama for MCP servers by keyword.",
    category: "mcp-registry",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for MCP servers." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "mcp_registry_get",
    description: "Get detailed information about a specific MCP server including connection config and required environment variables.",
    category: "mcp-registry",
    inputSchema: {
      type: "object",
      properties: {
        serverId: { type: "string", description: "Server identifier." },
        source: { type: "string", enum: ["smithery", "official", "glama"], description: "Registry source." },
      },
      required: ["serverId", "source"],
    },
  },
  {
    name: "mcp_registry_install",
    description: "Auto-configure an MCP server by generating a .mcp.json entry.",
    category: "mcp-registry",
    inputSchema: {
      type: "object",
      properties: {
        serverId: { type: "string", description: "Server identifier." },
        source: { type: "string", enum: ["smithery", "official", "glama"], description: "Registry source." },
        envVars: { type: "object", description: "Environment variables for the server." },
      },
      required: ["serverId", "source"],
    },
  },
  {
    name: "mcp_registry_list_installed",
    description: "List all currently configured MCP servers from .mcp.json.",
    category: "mcp-registry",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
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
