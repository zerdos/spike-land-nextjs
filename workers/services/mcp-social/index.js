// MCP Domain Worker: Social
// Handles: social-accounts, inbox, calendar, relay, crisis

const TOOLS = [
  // ── social-accounts ──
  {
    name: "social_list_accounts",
    description: "List social media accounts in a workspace with optional platform and status filters.",
    category: "social-accounts",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        platform: { type: "string", description: "Filter by platform (e.g., INSTAGRAM, TWITTER, FACEBOOK)." },
        status: { type: "string", description: "Filter by status: ACTIVE, DISCONNECTED, or EXPIRED." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "social_get_account",
    description: "Get detailed information about a specific social media account.",
    category: "social-accounts",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_id: { type: "string", minLength: 1, description: "Social account database ID." },
      },
      required: ["workspace_slug", "account_id"],
    },
  },
  {
    name: "social_publish_post",
    description: "Create a social media post and link it to one or more accounts.",
    category: "social-accounts",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Array of social account IDs to publish to.",
        },
        content: { type: "string", minLength: 1, description: "Post content text." },
        scheduled_at: { type: "string", description: "Optional ISO 8601 date to schedule the post." },
      },
      required: ["workspace_slug", "account_ids", "content"],
    },
  },
  {
    name: "social_get_post",
    description: "Get a social media post with its linked accounts and metrics.",
    category: "social-accounts",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        post_id: { type: "string", minLength: 1, description: "Social post ID." },
      },
      required: ["workspace_slug", "post_id"],
    },
  },
  {
    name: "social_delete_post",
    description: "Delete a social media post. Requires explicit confirmation.",
    category: "social-accounts",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        post_id: { type: "string", minLength: 1, description: "Social post ID to delete." },
        confirm: { type: "boolean", description: "Must be true to confirm deletion." },
      },
      required: ["workspace_slug", "post_id", "confirm"],
    },
  },

  // ── inbox ──
  {
    name: "inbox_list_items",
    description: "List inbox items for a workspace with optional filters for status and platform.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        status: { type: "string", description: "Filter by status: UNREAD, READ, ARCHIVED, RESOLVED." },
        platform: { type: "string", description: "Filter by platform (e.g. instagram, twitter)." },
        limit: { type: "number", default: 20, description: "Max items to return (default 20)." },
        offset: { type: "number", default: 0, description: "Pagination offset (default 0)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "inbox_get_item",
    description: "Get full details of a specific inbox item including suggested responses and drafts.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        item_id: { type: "string", minLength: 1, description: "Inbox item ID." },
      },
      required: ["workspace_slug", "item_id"],
    },
  },
  {
    name: "inbox_reply",
    description: "Record a reply to an inbox item and mark it as resolved.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        item_id: { type: "string", minLength: 1, description: "Inbox item ID to reply to." },
        content: { type: "string", minLength: 1, description: "Reply content." },
      },
      required: ["workspace_slug", "item_id", "content"],
    },
  },
  {
    name: "inbox_archive",
    description: "Archive multiple inbox items at once.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        item_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Array of inbox item IDs to archive.",
        },
      },
      required: ["workspace_slug", "item_ids"],
    },
  },
  {
    name: "inbox_route",
    description: "Route an inbox item to a team member and view routing analysis.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        item_id: { type: "string", minLength: 1, description: "Inbox item ID to route." },
        assign_to_member_id: { type: "string", description: "Member ID to assign this item to." },
      },
      required: ["workspace_slug", "item_id"],
    },
  },
  {
    name: "inbox_get_priority_score",
    description: "Get priority breakdown and sentiment analysis for an inbox item.",
    category: "inbox",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        item_id: { type: "string", minLength: 1, description: "Inbox item ID." },
      },
      required: ["workspace_slug", "item_id"],
    },
  },

  // ── calendar ──
  {
    name: "calendar_schedule_post",
    description: "Schedule a social media post for a specific date and time.",
    category: "calendar",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        content: { type: "string", minLength: 1, description: "Post content text." },
        account_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Array of social account IDs.",
        },
        scheduled_at: { type: "string", minLength: 1, description: "ISO 8601 date for scheduling." },
      },
      required: ["workspace_slug", "content", "account_ids", "scheduled_at"],
    },
  },
  {
    name: "calendar_list_scheduled",
    description: "List scheduled posts in a workspace with optional date range filter.",
    category: "calendar",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        from_date: { type: "string", description: "Start date filter (ISO 8601)." },
        to_date: { type: "string", description: "End date filter (ISO 8601)." },
        limit: { type: "number", default: 30, description: "Max posts to return (default 30)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "calendar_cancel_post",
    description: "Cancel a scheduled post.",
    category: "calendar",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        post_id: { type: "string", minLength: 1, description: "Scheduled post ID to cancel." },
      },
      required: ["workspace_slug", "post_id"],
    },
  },
  {
    name: "calendar_get_best_times",
    description: "Get recommended best posting times for a social account.",
    category: "calendar",
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
    name: "calendar_detect_gaps",
    description: "Detect days with no scheduled content in the upcoming period.",
    category: "calendar",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        days_ahead: { type: "number", default: 7, description: "Number of days to look ahead (default 7)." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── relay ──
  {
    name: "relay_generate_drafts",
    description: "Generate AI response drafts for an inbox item. Creates PENDING drafts for human review.",
    category: "relay",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        inbox_item_id: { type: "string", minLength: 1, description: "Inbox item ID to generate drafts for." },
        count: { type: "number", default: 3, description: "Number of drafts to generate (default 3)." },
        tone: { type: "string", description: "Desired tone for responses (e.g. friendly, formal, casual)." },
      },
      required: ["workspace_slug", "inbox_item_id"],
    },
  },
  {
    name: "relay_approve_draft",
    description: "Approve a pending relay draft for sending.",
    category: "relay",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        draft_id: { type: "string", minLength: 1, description: "Draft ID to approve." },
      },
      required: ["workspace_slug", "draft_id"],
    },
  },
  {
    name: "relay_reject_draft",
    description: "Reject a relay draft with an optional reason.",
    category: "relay",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        draft_id: { type: "string", minLength: 1, description: "Draft ID to reject." },
        reason: { type: "string", description: "Reason for rejection." },
      },
      required: ["workspace_slug", "draft_id"],
    },
  },
  {
    name: "relay_get_metrics",
    description: "Get relay draft metrics for a workspace over a time period.",
    category: "relay",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        days: { type: "number", default: 30, description: "Number of days to look back (default 30)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "relay_list_pending",
    description: "List pending relay drafts awaiting review.",
    category: "relay",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        limit: { type: "number", default: 20, description: "Max items to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },

  // ── crisis ──
  {
    name: "crisis_detect",
    description: "Detect active crisis events in a workspace with optional severity filtering.",
    category: "crisis",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        severity: { type: "string", description: "Filter by severity (e.g., LOW, MEDIUM, HIGH, CRITICAL)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "crisis_get_timeline",
    description: "Get the timeline of a crisis event including status and notes.",
    category: "crisis",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        crisis_id: { type: "string", minLength: 1, description: "Crisis event ID." },
      },
      required: ["workspace_slug", "crisis_id"],
    },
  },
  {
    name: "crisis_pause_automation",
    description: "Pause all automation for specified social accounts during a crisis. Requires confirmation.",
    category: "crisis",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        account_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          description: "Social account IDs to pause. If empty, pauses all.",
        },
        reason: { type: "string", minLength: 1, description: "Reason for pausing automation." },
        confirm: { type: "boolean", description: "Must be true to confirm the pause." },
      },
      required: ["workspace_slug", "reason", "confirm"],
    },
  },
  {
    name: "crisis_get_templates",
    description: "Get crisis response templates with optional category filtering.",
    category: "crisis",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        category: { type: "string", description: "Filter templates by category." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "crisis_respond",
    description: "Record a response to a crisis event using a template or custom response text.",
    category: "crisis",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        crisis_id: { type: "string", minLength: 1, description: "Crisis event ID." },
        template_id: { type: "string", description: "Response template ID to use." },
        custom_response: { type: "string", description: "Custom response text (used if no template_id)." },
      },
      required: ["workspace_slug", "crisis_id"],
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
