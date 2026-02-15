// MCP Domain Worker: Brand
// Handles: brand-brain, scout, allocator, agency

const TOOLS = [
  // ── brand-brain ──
  {
    name: "brand_score_content",
    description: "Score content against brand vocabulary and guardrails. Returns a score (0-100) with violations.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        content: { type: "string", minLength: 1, description: "Content text to score against brand guidelines." },
        platform: { type: "string", description: "Target platform for scoring context." },
      },
      required: ["workspace_slug", "content"],
    },
  },
  {
    name: "brand_rewrite_content",
    description: "Submit content for brand-aligned rewriting. Creates a rewrite job.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        content: { type: "string", minLength: 1, description: "Content text to rewrite." },
        platform: { type: "string", default: "GENERAL", description: "Target platform (default: GENERAL)." },
        character_limit: { type: "number", description: "Maximum character count for rewrite." },
      },
      required: ["workspace_slug", "content"],
    },
  },
  {
    name: "brand_get_profile",
    description: "Get the brand profile for a workspace including guardrails and vocabulary stats.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "brand_check_policy",
    description: "Check content against active policy rules. Returns PASSED, PASSED_WITH_WARNINGS, or FAILED.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        content: { type: "string", minLength: 1, description: "Content text to check against policies." },
        content_type: { type: "string", default: "POST", description: "Content type (default: POST)." },
        platform: { type: "string", description: "Target platform for context." },
      },
      required: ["workspace_slug", "content"],
    },
  },
  {
    name: "brand_list_violations",
    description: "List recent policy violations for a workspace with optional severity filter.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        severity: { type: "string", description: "Filter by severity: LOW, MEDIUM, HIGH, CRITICAL." },
        limit: { type: "number", default: 20, description: "Max entries to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "brand_get_guardrails",
    description: "List active brand guardrails for a workspace.",
    category: "brand-brain",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── scout ──
  {
    name: "scout_list_competitors",
    description: "List tracked competitors in a workspace.",
    category: "scout",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "scout_add_competitor",
    description: "Add a new competitor to track in a workspace.",
    category: "scout",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        name: { type: "string", minLength: 1, description: "Competitor display name." },
        platform: { type: "string", minLength: 1, description: "Platform (e.g., INSTAGRAM, TWITTER)." },
        handle: { type: "string", minLength: 1, description: "Competitor handle on the platform." },
      },
      required: ["workspace_slug", "name", "platform", "handle"],
    },
  },
  {
    name: "scout_get_benchmark",
    description: "Get benchmark comparisons for a workspace, optionally filtered by competitor.",
    category: "scout",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        competitor_id: { type: "string", description: "Optional competitor ID to filter benchmarks." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "scout_list_topics",
    description: "List trending topics in a workspace ordered by trend score.",
    category: "scout",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        limit: { type: "number", default: 20, description: "Max topics to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "scout_get_insights",
    description: "Get competitive insights for a workspace, optionally filtered by competitor.",
    category: "scout",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        competitor_id: { type: "string", description: "Optional competitor ID to filter insights." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── allocator ──
  {
    name: "allocator_get_recommendations",
    description: "Get budget allocation recommendations for a workspace, optionally filtered by campaign.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        campaign_id: { type: "string", description: "Filter recommendations by campaign ID." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "allocator_list_campaigns",
    description: "List ad campaigns in a workspace with optional platform filter.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        platform: { type: "string", description: "Filter by platform: FACEBOOK_ADS, GOOGLE_ADS, or LINKEDIN_ADS." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "allocator_get_benchmarks",
    description: "Get performance benchmarks for a specific campaign.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        campaign_id: { type: "string", minLength: 1, description: "Campaign ID to get benchmarks for." },
      },
      required: ["workspace_slug", "campaign_id"],
    },
  },
  {
    name: "allocator_execute_move",
    description: "Approve and execute a budget allocation move. Requires confirmation.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        execution_id: { type: "string", minLength: 1, description: "Execution ID to approve." },
        confirm: { type: "boolean", description: "Must be true to confirm execution." },
      },
      required: ["workspace_slug", "execution_id", "confirm"],
    },
  },
  {
    name: "allocator_get_audit_log",
    description: "Get the audit log of budget allocation changes for a workspace.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        campaign_id: { type: "string", description: "Filter audit log by campaign ID." },
        limit: { type: "number", default: 20, description: "Max entries to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "allocator_set_guardrails",
    description: "Configure budget allocation guardrails for a workspace or specific campaign.",
    category: "allocator",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        campaign_id: { type: "string", description: "Campaign ID (workspace-wide if omitted)." },
        max_daily_budget_change: { type: "number", description: "Max daily budget change in currency." },
        max_single_change: { type: "number", description: "Max single budget adjustment." },
        min_roas_threshold: { type: "number", description: "Minimum ROAS before pausing." },
        max_cpa_threshold: { type: "number", description: "Maximum CPA threshold." },
        pause_on_anomaly: { type: "boolean", description: "Pause allocations on metric anomaly." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── agency ──
  {
    name: "agency_generate_persona",
    description: "Generate a brand persona for a client. Creates a persona record.",
    category: "agency",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        name: { type: "string", minLength: 1, description: "Persona name." },
        tagline: { type: "string", minLength: 1, description: "Persona tagline." },
        primary_hook: { type: "string", minLength: 1, description: "Primary hook for the persona." },
      },
      required: ["workspace_slug", "name", "tagline", "primary_hook"],
    },
  },
  {
    name: "agency_list_portfolio",
    description: "List the agency portfolio items for a workspace.",
    category: "agency",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        limit: { type: "number", default: 20, description: "Max items to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "agency_verify_domain",
    description: "Verify domain ownership for white-label branding.",
    category: "agency",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        domain: { type: "string", minLength: 1, description: "Domain to verify." },
      },
      required: ["workspace_slug", "domain"],
    },
  },
  {
    name: "agency_get_theme",
    description: "Get the white-label theme configuration for a workspace.",
    category: "agency",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
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
