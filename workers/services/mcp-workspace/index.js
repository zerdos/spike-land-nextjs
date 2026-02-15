// MCP Domain Worker: Workspace
// Handles: workspaces, admin, dash, settings, permissions, policy, white-label, boxes, jobs, reminders, share, bootstrap, auth, vault, env

const TOOLS = [
  // ── Workspaces Tools ──
  {
    name: "workspaces_list",
    description: "List all workspaces you are a member of.",
    category: "workspaces",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "workspaces_create",
    description: "Create a new workspace and become its owner.",
    category: "workspaces",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workspace name (2-50 chars)." },
        slug: { type: "string", description: "URL-safe slug (auto-generated if omitted)." },
      },
      required: ["name"],
    },
  },
  {
    name: "workspaces_get",
    description: "Get workspace details by ID or slug.",
    category: "workspaces",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID." },
        slug: { type: "string", description: "Workspace slug." },
      },
      required: [],
    },
  },
  {
    name: "workspaces_update",
    description: "Update a workspace's name or slug.",
    category: "workspaces",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID to update." },
        name: { type: "string", description: "New name." },
        slug: { type: "string", description: "New slug." },
      },
      required: ["workspace_id"],
    },
  },
  {
    name: "workspaces_favorite",
    description: "Toggle favorite status for a workspace.",
    category: "workspaces",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID to toggle favorite." },
      },
      required: ["workspace_id"],
    },
  },
  // ── Admin Tools ──
  {
    name: "admin_list_agents",
    description: "List all registered AI providers and their statuses.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ACTIVE", "INACTIVE", "ALL"], description: "Filter by agent status." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "admin_manage_agent",
    description: "Set an AI provider as the default or remove default status.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent ID to manage." },
        action: { type: "string", enum: ["activate", "deactivate", "restart"], description: "Action to perform." },
      },
      required: ["agent_id", "action"],
    },
  },
  {
    name: "admin_list_emails",
    description: "List sent, pending, or failed emails from the platform.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["SENT", "PENDING", "FAILED", "ALL"], description: "Filter by status." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "admin_send_email",
    description: "Send an email using a predefined template.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string", description: "Email subject." },
        template: { type: "string", description: "Email template name." },
      },
      required: ["to", "subject", "template"],
    },
  },
  {
    name: "admin_list_gallery",
    description: "List gallery items, optionally filtering by active status.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)." },
        featured: { type: "boolean", description: "Filter by active/featured status." },
      },
      required: [],
    },
  },
  {
    name: "admin_manage_gallery",
    description: "Activate, deactivate, or remove a gallery item.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "Gallery item ID." },
        action: { type: "string", enum: ["feature", "unfeature", "remove"], description: "Gallery action." },
      },
      required: ["item_id", "action"],
    },
  },
  {
    name: "admin_list_jobs",
    description: "List background jobs with optional status filter.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "ALL"], description: "Filter by status." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "admin_manage_job",
    description: "Cancel, retry, or delete a background job.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job ID." },
        action: { type: "string", enum: ["cancel", "retry", "delete"], description: "Job action." },
      },
      required: ["job_id", "action"],
    },
  },
  {
    name: "admin_list_photos",
    description: "List photos with visibility filter.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["PUBLIC", "PRIVATE", "ALL"], description: "Filter by visibility." },
        limit: { type: "number", description: "Max results (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "admin_moderate_photo",
    description: "Approve (make public) or reject (make private) a photo.",
    category: "admin",
    inputSchema: {
      type: "object",
      properties: {
        photo_id: { type: "string", description: "Photo ID." },
        action: { type: "string", enum: ["approve", "reject"], description: "Moderation action (approve = make public, reject = make private)." },
      },
      required: ["photo_id", "action"],
    },
  },
  // ── Dashboard Tools ──
  {
    name: "dash_overview",
    description: "Get a high-level overview of the platform: user count, agents, jobs, errors, and credits.",
    category: "dash",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "dash_health",
    description: "Check health of core services: database, Redis, and external service configurations.",
    category: "dash",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "dash_errors",
    description: "List recent errors from the agent audit log.",
    category: "dash",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max errors to return (default 20)." },
        hours: { type: "number", description: "Lookback hours (default 24)." },
      },
      required: [],
    },
  },
  {
    name: "dash_activity_feed",
    description: "Get combined recent activity feed: agents, jobs, and deployments.",
    category: "dash",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max items to return (default 20)." },
      },
      required: [],
    },
  },
  {
    name: "dash_widget_data",
    description: "Get data for a specific dashboard widget by its ID.",
    category: "dash",
    inputSchema: {
      type: "object",
      properties: {
        widget_id: { type: "string", enum: ["metrics", "environments", "agents", "alerts", "deployments"], description: "Widget identifier." },
      },
      required: ["widget_id"],
    },
  },
  // ── Settings Tools ──
  {
    name: "settings_list_api_keys",
    description: "List your API keys (keys are masked for security).",
    category: "settings",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "settings_create_api_key",
    description: "Create a new API key. The full key is shown ONLY once.",
    category: "settings",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the API key." },
      },
      required: ["name"],
    },
  },
  {
    name: "settings_revoke_api_key",
    description: "Revoke (deactivate) an API key.",
    category: "settings",
    inputSchema: {
      type: "object",
      properties: {
        key_id: { type: "string", description: "API key ID to revoke." },
      },
      required: ["key_id"],
    },
  },
  {
    name: "settings_mcp_history",
    description: "List MCP job history with pagination and optional type filter.",
    category: "settings",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["GENERATE", "MODIFY"], description: "Filter by job type." },
        limit: { type: "number", description: "Max jobs to return (default 12)." },
        offset: { type: "number", description: "Offset for pagination (default 0)." },
      },
      required: [],
    },
  },
  {
    name: "settings_mcp_job_detail",
    description: "Get full detail for a single MCP job including images and processing time.",
    category: "settings",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "MCP job ID." },
      },
      required: ["job_id"],
    },
  },
  // ── Permissions Tools ──
  {
    name: "permissions_list_pending",
    description: "List pending permission requests for the user.",
    category: "permissions",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "permissions_respond",
    description: "Approve or deny a permission request.",
    category: "permissions",
    inputSchema: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "The ID of the permission request." },
        action: { type: "string", enum: ["APPROVE", "DENY"], description: "Approve or deny the request." },
      },
      required: ["requestId", "action"],
    },
  },
  // ── Policy Tools ──
  {
    name: "policy_list_rules",
    description: "List policy rules for a workspace.",
    category: "policy",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        platform: { type: "string", enum: ["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"], description: "Filter by platform." },
        category: { type: "string", description: "Filter by category." },
        isActive: { type: "boolean", description: "Filter by active status." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "policy_create_rule",
    description: "Create a new policy rule for a workspace.",
    category: "policy",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        name: { type: "string", description: "Rule name." },
        description: { type: "string", description: "Rule description." },
        platform: { type: "string", enum: ["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"], description: "Platform (optional)." },
        category: { type: "string", description: "Rule category." },
        ruleType: { type: "string", description: "Rule type." },
        conditions: { type: "object", description: "Conditions as JSON object." },
        severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "WARNING", "ERROR"], description: "Severity level (default MEDIUM)." },
        isBlocking: { type: "boolean", description: "Whether violations block publishing (default false)." },
        isActive: { type: "boolean", description: "Whether rule is active (default true)." },
        sourceUrl: { type: "string", description: "Source URL reference." },
      },
      required: ["workspace_slug", "name", "description", "category", "ruleType", "conditions"],
    },
  },
  {
    name: "policy_check_content",
    description: "Check content against workspace policies.",
    category: "policy",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        content: { type: "string", description: "Content text to check." },
        platform: { type: "string", enum: ["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "DISCORD", "SNAPCHAT", "PINTEREST"], description: "Target platform." },
        metadata: { type: "object", description: "Additional metadata." },
      },
      required: ["workspace_slug", "content"],
    },
  },
  // ── White-Label Tools ──
  {
    name: "white_label_get_config",
    description: "Fetch workspace white-label configuration.",
    category: "white-label",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "white_label_update_config",
    description: "Update workspace white-label configuration.",
    category: "white-label",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        config: {
          type: "object",
          description: "White-label configuration fields to update.",
          properties: {
            customDomain: { type: "string", description: "Custom domain." },
            primaryColor: { type: "string", description: "Primary hex color." },
            secondaryColor: { type: "string", description: "Secondary hex color." },
            accentColor: { type: "string", description: "Accent hex color." },
            fontFamily: { type: "string", description: "Font family name." },
            logoUrl: { type: "string", description: "Logo URL." },
            faviconUrl: { type: "string", description: "Favicon URL." },
            emailSenderName: { type: "string", description: "Email sender name." },
            emailSenderDomain: { type: "string", description: "Email sender domain." },
            emailHeaderLogoUrl: { type: "string", description: "Email header logo URL." },
            emailFooterText: { type: "string", description: "Email footer text." },
            loginPageTitle: { type: "string", description: "Login page title." },
            loginPageDescription: { type: "string", description: "Login page description." },
            loginBackgroundUrl: { type: "string", description: "Login background image URL." },
            showPoweredBySpikeLand: { type: "boolean", description: "Show powered-by branding." },
            pdfHeaderLogoUrl: { type: "string", description: "PDF header logo URL." },
            pdfFooterText: { type: "string", description: "PDF footer text." },
          },
        },
      },
      required: ["workspace_slug", "config"],
    },
  },
  // ── Boxes Tools ──
  {
    name: "boxes_list",
    description: "List all boxes for the current user.",
    category: "boxes",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "boxes_create",
    description: "Create a new box.",
    category: "boxes",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Box name (1-50 chars)." },
        tierId: { type: "string", description: "Box tier ID." },
      },
      required: ["name", "tierId"],
    },
  },
  {
    name: "boxes_action",
    description: "Start, stop, or restart a box.",
    category: "boxes",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Box ID." },
        action: { type: "string", enum: ["START", "STOP", "RESTART"], description: "Action to perform." },
      },
      required: ["id", "action"],
    },
  },
  {
    name: "boxes_get",
    description: "Get box details.",
    category: "boxes",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Box ID." },
      },
      required: ["id"],
    },
  },
  // ── Jobs Tools ──
  {
    name: "jobs_get",
    description: "Get status and details of a specific job.",
    category: "jobs",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID." },
      },
      required: ["jobId"],
    },
  },
  {
    name: "jobs_batch_status",
    description: "Fetch status for multiple job IDs at once.",
    category: "jobs",
    inputSchema: {
      type: "object",
      properties: {
        jobIds: { type: "array", items: { type: "string" }, description: "Array of job IDs (max 50)." },
      },
      required: ["jobIds"],
    },
  },
  {
    name: "jobs_mix_history",
    description: "Get recent mixing job history.",
    category: "jobs",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)." },
        offset: { type: "number", description: "Pagination offset (default 0)." },
      },
      required: [],
    },
  },
  {
    name: "jobs_cancel",
    description: "Cancel a pending job.",
    category: "jobs",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID to cancel." },
      },
      required: ["jobId"],
    },
  },
  // ── Reminders Tools ──
  {
    name: "reminders_list",
    description: "List connection reminders for a workspace.",
    category: "reminders",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        status: { type: "string", enum: ["ACTIVE", "COMPLETED", "ALL"], description: "Filter by status (default ACTIVE)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "reminders_create",
    description: "Create a new connection reminder.",
    category: "reminders",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        title: { type: "string", description: "Reminder title." },
        description: { type: "string", description: "Reminder description." },
        type: { type: "string", enum: ["FOLLOW_UP", "RECONNECT", "OTHER"], description: "Reminder type (default OTHER)." },
        dueDate: { type: "string", description: "Due date in ISO 8601 format." },
        connectionId: { type: "string", description: "Connection ID to associate this reminder with." },
      },
      required: ["workspace_slug", "title", "dueDate", "connectionId"],
    },
  },
  {
    name: "reminders_complete",
    description: "Mark a reminder as completed.",
    category: "reminders",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        reminderId: { type: "string", description: "Reminder ID." },
      },
      required: ["workspace_slug", "reminderId"],
    },
  },
  // ── Share Tools ──
  {
    name: "share_create_token",
    description: "Generate a unique share token for an image.",
    category: "share",
    inputSchema: {
      type: "object",
      properties: {
        imageId: { type: "string", description: "ID of the image to share." },
      },
      required: ["imageId"],
    },
  },
  {
    name: "share_get_info",
    description: "Get metadata for a shared image using a token.",
    category: "share",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Share token." },
      },
      required: ["token"],
    },
  },
  // ── Bootstrap Tools ──
  {
    name: "bootstrap_workspace",
    description: "Create or update a workspace configuration for the user. A workspace is the container for secrets, tools, and apps.",
    category: "bootstrap",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workspace name (1-100 chars)." },
        settings: { type: "object", description: "Optional workspace settings." },
      },
      required: ["name"],
    },
  },
  {
    name: "bootstrap_connect_integration",
    description: "Connect an integration by storing its credentials in the encrypted vault. Secrets start in PENDING status until approved.",
    category: "bootstrap",
    inputSchema: {
      type: "object",
      properties: {
        integration_name: { type: "string", description: "Integration name (alphanumeric + underscores, starts with letter)." },
        credentials: { type: "object", description: "Key-value pairs of credential names to values." },
        allowed_urls: { type: "array", items: { type: "string" }, description: "URLs allowed to use these credentials (max 20)." },
      },
      required: ["integration_name", "credentials"],
    },
  },
  {
    name: "bootstrap_create_app",
    description: "Create a live app: optionally create/update a codespace, then link it to my-apps on spike.land.",
    category: "bootstrap",
    inputSchema: {
      type: "object",
      properties: {
        app_name: { type: "string", description: "App name (3-50 chars)." },
        description: { type: "string", description: "App description (10-500 chars)." },
        code: { type: "string", description: "Source code for the codespace." },
        codespace_id: { type: "string", description: "Codespace ID (auto-generated from app name if omitted)." },
      },
      required: ["app_name"],
    },
  },
  {
    name: "bootstrap_status",
    description: "Get the current workspace setup status: workspace config, secrets, tools, and apps.",
    category: "bootstrap",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Auth Tools ──
  {
    name: "auth_check_session",
    description: "Validate the current user's authentication session and return user info.",
    category: "auth",
    inputSchema: {
      type: "object",
      properties: {
        session_token: { type: "string", description: "Optional session token to validate." },
      },
      required: [],
    },
  },
  {
    name: "auth_check_route_access",
    description: "Check if the current user has access to a specific route based on their role.",
    category: "auth",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Route path to check access for (e.g., /admin, /dashboard)." },
      },
      required: ["path"],
    },
  },
  {
    name: "auth_get_profile",
    description: "Get the current user's full profile with optional workspace memberships.",
    category: "auth",
    inputSchema: {
      type: "object",
      properties: {
        include_workspaces: { type: "boolean", description: "Include workspace memberships (default false)." },
      },
      required: [],
    },
  },
  // ── Vault Tools ──
  {
    name: "vault_store_secret",
    description: "Store an encrypted secret (API key, OAuth token, etc.) in the vault. The secret is encrypted at rest and NEVER readable in plaintext. Secrets start in PENDING status until approved by the user.",
    category: "vault",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Secret name (letters, numbers, underscores; starts with a letter)." },
        value: { type: "string", description: "Secret value (1-10000 chars)." },
        allowed_urls: { type: "array", items: { type: "string" }, description: "URLs allowed to access this secret (max 20)." },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "vault_list_secrets",
    description: "List all secrets in the vault. Returns names and status only -- NEVER returns secret values.",
    category: "vault",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "vault_delete_secret",
    description: "Revoke and soft-delete a secret from the vault.",
    category: "vault",
    inputSchema: {
      type: "object",
      properties: {
        secret_id: { type: "string", description: "Secret ID to revoke." },
      },
      required: ["secret_id"],
    },
  },
  {
    name: "vault_approve_secret",
    description: "Approve a pending secret for use in tool handlers. Only the secret owner can approve.",
    category: "vault",
    inputSchema: {
      type: "object",
      properties: {
        secret_id: { type: "string", description: "Secret ID to approve." },
      },
      required: ["secret_id"],
    },
  },
  // ── Environment Tools ──
  {
    name: "env_list",
    description: "List all registered environments with their URLs and health endpoints.",
    category: "env",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "env_status",
    description: "Check the health status of a specific environment.",
    category: "env",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", enum: ["dev", "preview", "prod"], description: "Environment name." },
      },
      required: ["name"],
    },
  },
  {
    name: "env_compare",
    description: "Compare two environments side by side (health, version, commit).",
    category: "env",
    inputSchema: {
      type: "object",
      properties: {
        env_a: { type: "string", enum: ["dev", "preview", "prod"], description: "First environment." },
        env_b: { type: "string", enum: ["dev", "preview", "prod"], description: "Second environment." },
      },
      required: ["env_a", "env_b"],
    },
  },
  {
    name: "env_deployments",
    description: "List recent deployments from Vercel.",
    category: "env",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max deployments (default 10)." },
        state: { type: "string", description: "Filter by deployment state (e.g. READY, ERROR)." },
      },
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
