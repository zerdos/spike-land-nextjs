// MCP Domain Worker: Analytics
// Handles: pulse, boost, ab-testing, creative, tracking

const TOOLS = [
  // ── pulse ──
  {
    name: "pulse_get_health_score",
    description: "Get the health score and status for a specific social account.",
    category: "pulse",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_id: { type: "string", minLength: 1, description: "Social account ID." },
      },
      required: ["workspace_slug", "account_id"],
    },
  },
  {
    name: "pulse_list_anomalies",
    description: "List detected metric anomalies for social accounts in a workspace.",
    category: "pulse",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        severity: { type: "string", description: "Filter by severity (e.g., LOW, MEDIUM, HIGH, CRITICAL)." },
        limit: { type: "number", default: 20, description: "Max anomalies to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "pulse_get_metrics",
    description: "Get social media metrics for an account over a specified number of days.",
    category: "pulse",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_id: { type: "string", minLength: 1, description: "Social account ID." },
        days: { type: "number", default: 7, description: "Number of days of metrics to retrieve (default 7)." },
      },
      required: ["workspace_slug", "account_id"],
    },
  },
  {
    name: "pulse_get_account_health",
    description: "Get a health dashboard view of all social accounts in a workspace.",
    category: "pulse",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "pulse_list_health_events",
    description: "List health events for social accounts in a workspace.",
    category: "pulse",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_id: { type: "string", description: "Filter by social account ID." },
        event_type: { type: "string", description: "Filter by event type." },
        limit: { type: "number", default: 20, description: "Max events to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── boost ──
  {
    name: "boost_detect_opportunities",
    description: "Detect posts with high boosting potential based on engagement metrics.",
    category: "boost",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        min_engagement_rate: { type: "number", default: 0.05, description: "Minimum engagement rate threshold (default 0.05)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "boost_get_recommendation",
    description: "Get detailed boost recommendation including post details and predicted metrics.",
    category: "boost",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        recommendation_id: { type: "string", minLength: 1, description: "Boost recommendation ID." },
      },
      required: ["workspace_slug", "recommendation_id"],
    },
  },
  {
    name: "boost_apply",
    description: "Apply a boost to a post based on a recommendation.",
    category: "boost",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        recommendation_id: { type: "string", minLength: 1, description: "Boost recommendation ID to apply." },
        budget: { type: "number", minimum: 0, description: "Budget amount for the boost." },
        confirm: { type: "boolean", description: "Must be true to confirm boost application." },
      },
      required: ["workspace_slug", "recommendation_id", "budget", "confirm"],
    },
  },
  {
    name: "boost_predict_roi",
    description: "Predict ROI for boosting a specific post with a given budget.",
    category: "boost",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        post_id: { type: "string", minLength: 1, description: "Post ID to predict ROI for." },
        budget: { type: "number", minimum: 0, description: "Budget amount to predict ROI for." },
      },
      required: ["workspace_slug", "post_id", "budget"],
    },
  },

  // ── ab-testing ──
  {
    name: "abtest_create",
    description: "Create an A/B test for a social post with multiple content variants.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        post_id: { type: "string", minLength: 1, description: "Social post ID to A/B test." },
        variant_contents: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 2,
          description: "Array of variant content strings (min 2).",
        },
        hypothesis: { type: "string", description: "Optional hypothesis for the test." },
      },
      required: ["workspace_slug", "post_id", "variant_contents"],
    },
  },
  {
    name: "abtest_get_results",
    description: "Get results and metrics for an A/B test including variant performance.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        test_id: { type: "string", minLength: 1, description: "A/B test ID." },
      },
      required: ["workspace_slug", "test_id"],
    },
  },
  {
    name: "abtest_declare_winner",
    description: "Declare a winning variant for an A/B test.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        test_id: { type: "string", minLength: 1, description: "A/B test ID." },
        winning_variant_id: { type: "string", minLength: 1, description: "ID of the winning variant." },
      },
      required: ["workspace_slug", "test_id", "winning_variant_id"],
    },
  },
  {
    name: "abtest_list_active",
    description: "List active A/B tests in a workspace.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "abtest_check_significance",
    description: "Check statistical significance of an A/B test using z-test analysis.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        test_id: { type: "string", minLength: 1, description: "A/B test ID." },
      },
      required: ["workspace_slug", "test_id"],
    },
  },
  {
    name: "abtest_assign_variant",
    description: "Assign a visitor to an A/B test variant. Returns the assigned variant name.",
    category: "ab-testing",
    inputSchema: {
      type: "object",
      properties: {
        test_id: { type: "string", minLength: 1, description: "A/B test ID." },
        visitor_id: { type: "string", minLength: 1, description: "Visitor ID to assign." },
      },
      required: ["test_id", "visitor_id"],
    },
  },

  // ── creative ──
  {
    name: "creative_generate_variants",
    description: "Create a creative set with variants from original content. Variants are created with PENDING status for async generation.",
    category: "creative",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        name: { type: "string", minLength: 1, description: "Creative set name." },
        content: { type: "string", minLength: 1, description: "Original creative content." },
        variant_count: { type: "number", default: 3, description: "Number of variants to generate (default 3)." },
      },
      required: ["workspace_slug", "name", "content"],
    },
  },
  {
    name: "creative_detect_fatigue",
    description: "Detect creative fatigue alerts for a workspace.",
    category: "creative",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        limit: { type: "number", default: 10, description: "Max number of alerts to return (default 10)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "creative_get_performance",
    description: "Get performance metrics for a creative set and its variants.",
    category: "creative",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        creative_set_id: { type: "string", minLength: 1, description: "Creative set ID." },
      },
      required: ["workspace_slug", "creative_set_id"],
    },
  },
  {
    name: "creative_list_sets",
    description: "List creative sets in a workspace.",
    category: "creative",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        limit: { type: "number", default: 20, description: "Max number of sets to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── tracking ──
  {
    name: "tracking_get_sessions",
    description: "List visitor sessions for a workspace within a time range.",
    category: "tracking",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        days: { type: "number", default: 7, description: "Lookback period in days (default 7)." },
        limit: { type: "number", default: 20, description: "Max sessions to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "tracking_get_attribution",
    description: "Get attribution analysis grouped by source, medium, and campaign.",
    category: "tracking",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        days: { type: "number", default: 30, description: "Lookback period in days (default 30)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "tracking_get_journey",
    description: "Get the page journey for a specific visitor session.",
    category: "tracking",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        session_id: { type: "string", minLength: 1, description: "Session ID to trace journey for." },
      },
      required: ["workspace_slug", "session_id"],
    },
  },
  {
    name: "tracking_query_events",
    description: "Query analytics events with optional filtering by event name.",
    category: "tracking",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        event_name: { type: "string", description: "Filter by event name." },
        days: { type: "number", default: 7, description: "Lookback period in days (default 7)." },
        limit: { type: "number", default: 50, description: "Max events to return (default 50)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "tracking_record_engagement",
    description: "Record page engagement data for a visitor including scroll depth, time on page, and sections viewed.",
    category: "tracking",
    inputSchema: {
      type: "object",
      properties: {
        visitor_id: { type: "string", minLength: 1, description: "Visitor ID." },
        session_id: { type: "string", minLength: 1, description: "Visitor session ID." },
        page: { type: "string", minLength: 1, description: "Page path." },
        scroll_depth: { type: "number", minimum: 0, maximum: 100, description: "Maximum scroll depth percentage." },
        time_ms: { type: "number", minimum: 0, description: "Time on page in milliseconds." },
        sections_viewed: {
          type: "array",
          items: { type: "string" },
          description: "IDs of page sections viewed.",
        },
      },
      required: ["visitor_id", "session_id", "page", "scroll_depth", "time_ms"],
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
