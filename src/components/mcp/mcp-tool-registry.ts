// Static registry of all MCP tools, categories, and their parameters.
// Extracted from packages/mcp-server/src/tools/ and packages/mcp-server/src/registry.ts

export interface McpToolParam {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  description: string;
  required: boolean;
  default?: unknown;
  enumValues?: string[];
  placeholder?: string;
}

export interface McpToolDef {
  name: string;
  displayName: string;
  description: string;
  category: string;
  tier: "free" | "workspace";
  params: McpToolParam[];
  responseType: "json" | "image" | "text";
  alwaysEnabled?: boolean;
}

export interface McpCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: "blue" | "green" | "orange" | "fuchsia" | "purple" | "pink" | "layers";
  toolCount: number;
  tier: "free" | "workspace";
}

export const MCP_CATEGORIES: McpCategory[] = [
  {
    id: "gateway-meta",
    name: "Discovery",
    description: "Search and activate tools with Progressive Context Disclosure",
    icon: "Compass",
    color: "blue",
    toolCount: 5,
    tier: "free",
  },
  {
    id: "image",
    name: "Image AI",
    description: "AI image generation, modification, and job management",
    icon: "ImagePlus",
    color: "fuchsia",
    toolCount: 3,
    tier: "free",
  },
  {
    id: "codespace",
    name: "Codespace",
    description: "Live React application development on testing.spike.land",
    icon: "Code2",
    color: "green",
    toolCount: 6,
    tier: "free",
  },
  {
    id: "jules",
    name: "Jules",
    description: "Async coding agent for background development tasks",
    icon: "Bot",
    color: "purple",
    toolCount: 5,
    tier: "free",
  },
  {
    id: "gateway",
    name: "Gateway",
    description: "BridgeMind project management, GitHub sync, and Bolt orchestration",
    icon: "Network",
    color: "orange",
    toolCount: 15,
    tier: "free",
  },
];

export const MCP_TOOLS: McpToolDef[] = [
  // ── Gateway-Meta (Always-On Discovery) ──────────────────────
  {
    name: "search_tools",
    displayName: "Search Tools",
    description:
      "Search all available spike.land tools by keyword or description. Returns matching tools and automatically makes them available for use.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    responseType: "json",
    params: [
      {
        name: "query",
        type: "string",
        description: 'Search query (e.g., "schedule post", "generate image")',
        required: true,
        placeholder: "generate image",
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum results to return (1-50)",
        required: false,
        default: 10,
      },
    ],
  },
  {
    name: "list_categories",
    displayName: "List Categories",
    description:
      "List all available tool categories with descriptions and tool counts.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    responseType: "json",
    params: [],
  },
  {
    name: "enable_category",
    displayName: "Enable Category",
    description:
      "Activate all tools in a specific category. After activation, tools appear in the tools list and can be called directly.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    responseType: "json",
    params: [
      {
        name: "category",
        type: "string",
        description: 'Category name to activate (e.g., "codespace", "image")',
        required: true,
        placeholder: "codespace",
      },
    ],
  },
  {
    name: "get_balance",
    displayName: "Get Balance",
    description:
      "Get the current token balance for AI image generation and modification.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    responseType: "json",
    params: [],
  },
  {
    name: "get_status",
    displayName: "Get Status",
    description:
      "Get platform status including available features, tool counts, and active categories.",
    category: "gateway-meta",
    tier: "free",
    alwaysEnabled: true,
    responseType: "json",
    params: [],
  },

  // ── Image Tools ─────────────────────────────────────────────
  {
    name: "generate_image",
    displayName: "Generate Image",
    description:
      "Generate a new image from a text prompt using Spike Land's AI.",
    category: "image",
    tier: "free",
    responseType: "image",
    params: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image to generate",
        required: true,
        placeholder: "A serene mountain landscape at sunset",
      },
      {
        name: "tier",
        type: "enum",
        description: "Quality tier: TIER_1K (1024px), TIER_2K (2048px), TIER_4K (4096px)",
        required: false,
        default: "TIER_1K",
        enumValues: ["TIER_1K", "TIER_2K", "TIER_4K"],
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "Things to avoid in the generated image",
        required: false,
        placeholder: "blurry, low quality",
      },
      {
        name: "aspect_ratio",
        type: "enum",
        description: "Output aspect ratio for the generated image",
        required: false,
        default: "1:1",
        enumValues: [
          "1:1", "3:2", "2:3", "3:4", "4:3",
          "4:5", "5:4", "9:16", "16:9", "21:9",
        ],
      },
      {
        name: "wait_for_completion",
        type: "boolean",
        description: "Wait for the job to complete before returning",
        required: false,
        default: true,
      },
    ],
  },
  {
    name: "modify_image",
    displayName: "Modify Image",
    description: "Modify an existing image using a text prompt.",
    category: "image",
    tier: "free",
    responseType: "image",
    params: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of how to modify the image",
        required: true,
        placeholder: "Add a rainbow in the sky",
      },
      {
        name: "image_url",
        type: "string",
        description: "URL of the image to modify",
        required: false,
        placeholder: "https://example.com/image.jpg",
      },
      {
        name: "image_base64",
        type: "string",
        description: "Base64-encoded image data",
        required: false,
      },
      {
        name: "mime_type",
        type: "string",
        description: "MIME type of the image",
        required: false,
        default: "image/jpeg",
      },
      {
        name: "tier",
        type: "enum",
        description: "Quality tier",
        required: false,
        default: "TIER_1K",
        enumValues: ["TIER_1K", "TIER_2K", "TIER_4K"],
      },
      {
        name: "wait_for_completion",
        type: "boolean",
        description: "Wait for the job to complete before returning",
        required: false,
        default: true,
      },
    ],
  },
  {
    name: "check_job",
    displayName: "Check Job",
    description: "Check the status of an image generation or modification job.",
    category: "image",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "job_id",
        type: "string",
        description: "The job ID to check",
        required: true,
        placeholder: "cm4xxxxx...",
      },
    ],
  },

  // ── Codespace Tools ─────────────────────────────────────────
  {
    name: "codespace_update",
    displayName: "Update Codespace",
    description:
      "Create or update a live React application on testing.spike.land.",
    category: "codespace",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "codespace_id",
        type: "string",
        description: "Unique identifier for the codespace",
        required: true,
        placeholder: "my-app",
      },
      {
        name: "code",
        type: "string",
        description: "JSX/TSX code for the React component",
        required: true,
        placeholder: 'export default () => <h1>Hello World</h1>',
      },
      {
        name: "run",
        type: "boolean",
        description: "Transpile immediately after update",
        required: false,
        default: true,
      },
    ],
  },
  {
    name: "codespace_run",
    displayName: "Run Codespace",
    description:
      "Transpile and render a codespace without updating code.",
    category: "codespace",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "codespace_id",
        type: "string",
        description: "Unique identifier for the codespace",
        required: true,
        placeholder: "my-app",
      },
    ],
  },
  {
    name: "codespace_screenshot",
    displayName: "Screenshot Codespace",
    description:
      "Get a JPEG screenshot of a running codespace.",
    category: "codespace",
    tier: "free",
    responseType: "image",
    params: [
      {
        name: "codespace_id",
        type: "string",
        description: "Unique identifier for the codespace",
        required: true,
        placeholder: "my-app",
      },
    ],
  },
  {
    name: "codespace_get",
    displayName: "Get Codespace",
    description:
      "Get the current code and session data for a codespace.",
    category: "codespace",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "codespace_id",
        type: "string",
        description: "Unique identifier for the codespace",
        required: true,
        placeholder: "my-app",
      },
    ],
  },
  {
    name: "codespace_link_app",
    displayName: "Link Codespace to App",
    description:
      "Link a codespace to the user's my-apps on spike.land.",
    category: "codespace",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "codespace_id",
        type: "string",
        description: "Codespace ID to link",
        required: true,
        placeholder: "my-app",
      },
      {
        name: "app_id",
        type: "string",
        description: "Existing app ID to link the codespace to",
        required: false,
      },
      {
        name: "app_name",
        type: "string",
        description: "Name for new app (if creating new)",
        required: false,
        placeholder: "My App",
      },
      {
        name: "app_description",
        type: "string",
        description: "Description for new app",
        required: false,
        placeholder: "A cool React app",
      },
    ],
  },
  {
    name: "codespace_list_my_apps",
    displayName: "List My Apps",
    description:
      "List the user's apps from spike.land.",
    category: "codespace",
    tier: "free",
    responseType: "json",
    params: [],
  },

  // ── Jules Tools ─────────────────────────────────────────────
  {
    name: "jules_list_sessions",
    displayName: "List Sessions",
    description:
      "List all Jules coding sessions with their current status.",
    category: "jules",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "status",
        type: "enum",
        description: "Filter by session status",
        required: false,
        enumValues: [
          "QUEUED", "PLANNING", "AWAITING_PLAN_APPROVAL",
          "IN_PROGRESS", "COMPLETED", "FAILED",
        ],
      },
      {
        name: "page_size",
        type: "number",
        description: "Number of sessions to return (1-50)",
        required: false,
        default: 20,
      },
    ],
  },
  {
    name: "jules_create_session",
    displayName: "Create Session",
    description:
      "Create a new Jules coding task for async implementation.",
    category: "jules",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "title",
        type: "string",
        description: "Short title for the task",
        required: true,
        placeholder: "Fix login bug",
      },
      {
        name: "task",
        type: "string",
        description: "Detailed task description (max 4000 chars)",
        required: true,
        placeholder: "Fix the authentication bug in the login flow...",
      },
      {
        name: "source_repo",
        type: "string",
        description: "GitHub repo in format 'owner/repo'",
        required: false,
        placeholder: "zerdos/spike-land-nextjs",
      },
      {
        name: "starting_branch",
        type: "string",
        description: "Branch to start from",
        required: false,
        default: "main",
      },
    ],
  },
  {
    name: "jules_get_session",
    displayName: "Get Session",
    description:
      "Get details and activities for a Jules session.",
    category: "jules",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "session_id",
        type: "string",
        description: "Jules session ID",
        required: true,
        placeholder: "session-id-here",
      },
      {
        name: "include_activities",
        type: "boolean",
        description: "Include recent activities",
        required: false,
        default: true,
      },
    ],
  },
  {
    name: "jules_approve_plan",
    displayName: "Approve Plan",
    description:
      "Approve the implementation plan for a Jules session.",
    category: "jules",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "session_id",
        type: "string",
        description: "Jules session ID to approve",
        required: true,
        placeholder: "session-id-here",
      },
    ],
  },
  {
    name: "jules_send_message",
    displayName: "Send Message",
    description:
      "Send a message to an active Jules session for clarification or updates.",
    category: "jules",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "session_id",
        type: "string",
        description: "Jules session ID",
        required: true,
        placeholder: "session-id-here",
      },
      {
        name: "message",
        type: "string",
        description: "Message to send (max 4000 chars)",
        required: true,
        placeholder: "Please also add error handling for...",
      },
    ],
  },

  // ── Gateway Tools (BridgeMind) ──────────────────────────────
  {
    name: "bridgemind_list_tasks",
    displayName: "List Tasks",
    description: "List tasks from the BridgeMind project board.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "status",
        type: "string",
        description: "Filter by task status",
        required: false,
      },
      {
        name: "sprint_id",
        type: "string",
        description: "Filter by sprint ID",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Max items to return (1-100)",
        required: false,
        default: 50,
      },
    ],
  },
  {
    name: "bridgemind_create_task",
    displayName: "Create Task",
    description: "Create a new task on the BridgeMind project board.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "title",
        type: "string",
        description: "Task title",
        required: true,
        placeholder: "Implement feature X",
      },
      {
        name: "description",
        type: "string",
        description: "Task description",
        required: true,
        placeholder: "Detailed description of the task...",
      },
      {
        name: "priority",
        type: "enum",
        description: "Task priority",
        required: false,
        default: "medium",
        enumValues: ["low", "medium", "high", "critical"],
      },
    ],
  },
  {
    name: "bridgemind_update_task",
    displayName: "Update Task",
    description: "Update an existing task on the BridgeMind board.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "task_id",
        type: "string",
        description: "Task ID to update",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "New title",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "New status",
        required: false,
      },
      {
        name: "priority",
        type: "string",
        description: "New priority",
        required: false,
      },
    ],
  },
  {
    name: "bridgemind_get_knowledge",
    displayName: "Search Knowledge",
    description: "Search the BridgeMind knowledge base.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
        placeholder: "authentication flow",
      },
    ],
  },
  {
    name: "bridgemind_add_knowledge",
    displayName: "Add Knowledge",
    description: "Add a new entry to the BridgeMind knowledge base.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "title",
        type: "string",
        description: "Knowledge entry title",
        required: true,
        placeholder: "How auth works",
      },
      {
        name: "content",
        type: "string",
        description: "Knowledge content",
        required: true,
        placeholder: "Detailed explanation...",
      },
    ],
  },
  {
    name: "bridgemind_list_sprints",
    displayName: "List Sprints",
    description: "List all sprints from BridgeMind.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [],
  },
  {
    name: "github_list_issues",
    displayName: "List Issues",
    description: "List issues from GitHub Projects V2.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "status",
        type: "string",
        description: "Filter by status",
        required: false,
      },
      {
        name: "first",
        type: "number",
        description: "Number of items (1-100)",
        required: false,
        default: 50,
      },
    ],
  },
  {
    name: "github_create_issue",
    displayName: "Create Issue",
    description: "Create a new GitHub issue.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "title",
        type: "string",
        description: "Issue title",
        required: true,
        placeholder: "Bug: login fails on Safari",
      },
      {
        name: "body",
        type: "string",
        description: "Issue body in markdown",
        required: true,
        placeholder: "## Description\n...",
      },
    ],
  },
  {
    name: "github_get_pr_status",
    displayName: "Get PR Status",
    description: "Get PR and CI status for a GitHub issue.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "issue_number",
        type: "number",
        description: "GitHub issue number",
        required: true,
      },
    ],
  },
  {
    name: "github_update_project_item",
    displayName: "Update Project Item",
    description: "Update a field value on a GitHub Projects V2 item.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "item_id",
        type: "string",
        description: "Project item ID",
        required: true,
      },
      {
        name: "field_id",
        type: "string",
        description: "Field ID to update",
        required: true,
      },
      {
        name: "value",
        type: "string",
        description: "New value for the field",
        required: true,
      },
    ],
  },
  {
    name: "sync_bridgemind_to_github",
    displayName: "Sync to GitHub",
    description: "Sync BridgeMind board items to GitHub Projects V2.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [
      {
        name: "dry_run",
        type: "boolean",
        description: "Preview without applying changes",
        required: false,
        default: false,
      },
    ],
  },
  {
    name: "sync_status",
    displayName: "Sync Status",
    description: "Get the current sync status between BridgeMind and GitHub.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [],
  },
  {
    name: "bolt_status",
    displayName: "Bolt Status",
    description: "Get the current Bolt orchestrator status.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [],
  },
  {
    name: "bolt_pause",
    displayName: "Bolt Pause",
    description: "Pause the Bolt orchestrator.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [],
  },
  {
    name: "bolt_resume",
    displayName: "Bolt Resume",
    description: "Resume the Bolt orchestrator after a pause.",
    category: "gateway",
    tier: "free",
    responseType: "json",
    params: [],
  },
];

// Helpers
export function getToolsByCategory(category: string): McpToolDef[] {
  return MCP_TOOLS.filter((t) => t.category === category);
}

export function getCategoryById(id: string): McpCategory | undefined {
  return MCP_CATEGORIES.find((c) => c.id === id);
}

export function getActiveCategories(): McpCategory[] {
  return MCP_CATEGORIES.filter((c) => c.toolCount > 0);
}

export function getAllCategories(): McpCategory[] {
  return MCP_CATEGORIES;
}

export const TOTAL_TOOL_COUNT = MCP_TOOLS.length;
export const TOTAL_CATEGORY_COUNT = MCP_CATEGORIES.length;
export const GATEWAY_TOOL_COUNT = MCP_TOOLS.filter((t) => t.alwaysEnabled).length;
export const ACTIVE_CATEGORY_COUNT = MCP_CATEGORIES.filter((c) => c.toolCount > 0).length;
