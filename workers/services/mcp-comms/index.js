// MCP Domain Worker: Communications
// Handles: chat, email, newsletter, tts, notifications

const TOOLS = [
  // ── Chat Tools ──
  {
    name: "chat_send_message",
    description: "Send a message to Claude and get a non-streaming AI response.",
    category: "chat",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The message to send to the AI." },
        model: { type: "string", enum: ["opus", "sonnet", "haiku"], description: "Claude model to use." },
        system_prompt: { type: "string", description: "Optional system prompt for the conversation." },
      },
      required: ["message"],
    },
  },
  // ── Email Tools ──
  {
    name: "email_send",
    description: "Send an email from the workspace. Records the send intent with SENT status.",
    category: "email",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string", description: "Email subject line." },
        template: { type: "string", description: "Email template name." },
      },
      required: ["workspace_slug", "to", "subject", "template"],
    },
  },
  {
    name: "email_get_status",
    description: "Get the delivery status of a sent email.",
    category: "email",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        email_id: { type: "string", description: "Email log ID." },
      },
      required: ["workspace_slug", "email_id"],
    },
  },
  {
    name: "email_list",
    description: "List recent email logs for the current user.",
    category: "email",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        limit: { type: "number", description: "Max records to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  // ── Newsletter Tools ──
  {
    name: "newsletter_subscribe",
    description: "Subscribe an email address to the newsletter.",
    category: "newsletter",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to subscribe." },
      },
      required: ["email"],
    },
  },
  // ── TTS Tools ──
  {
    name: "tts_synthesize",
    description: "Convert text to speech using ElevenLabs. Returns a URL to the generated audio.",
    category: "tts",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to convert to speech (max 5000 characters)." },
        voice_id: { type: "string", description: "ElevenLabs voice ID. Uses default voice if not specified." },
      },
      required: ["text"],
    },
  },
  // ── Notification Tools ──
  {
    name: "notification_list",
    description: "List notifications for the workspace, optionally filtered to unread only.",
    category: "notifications",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        unread_only: { type: "boolean", description: "Only show unread notifications." },
        limit: { type: "number", description: "Max items to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "notification_mark_read",
    description: "Mark one or more notifications as read.",
    category: "notifications",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        notification_ids: { type: "array", items: { type: "string" }, description: "Array of notification IDs to mark as read." },
      },
      required: ["workspace_slug", "notification_ids"],
    },
  },
  {
    name: "notification_configure_channels",
    description: "Configure notification delivery channels for the workspace.",
    category: "notifications",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        email_enabled: { type: "boolean", description: "Enable email notifications." },
        slack_enabled: { type: "boolean", description: "Enable Slack notifications." },
        in_app_enabled: { type: "boolean", description: "Enable in-app notifications." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "notification_send",
    description: "Send a notification to a specific user or the entire workspace.",
    category: "notifications",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        title: { type: "string", description: "Notification title." },
        message: { type: "string", description: "Notification message body." },
        priority: { type: "string", description: "Priority: LOW, MEDIUM, HIGH (default MEDIUM)." },
        user_id: { type: "string", description: "Specific user ID to notify. Omit for workspace-wide." },
      },
      required: ["workspace_slug", "title", "message"],
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
