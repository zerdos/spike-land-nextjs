// Auto-generated MCP tool registry — reads from build-time tools-manifest.json
// so the /mcp page always reflects the latest tools without manual updates.

import toolsManifest from "@/lib/docs/generated/tools-manifest.json";

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

// ── Category display metadata ───────────────────────────────────────
// Maps category id → display name, icon, and color for the UI.

type CategoryColor = McpCategory["color"];

const CATEGORY_META: Record<string, { displayName: string; icon: string; color: CategoryColor }> = {
  "gateway-meta": { displayName: "Discovery", icon: "Compass", color: "blue" },
  image: { displayName: "Image AI", icon: "ImagePlus", color: "fuchsia" },
  codespace: { displayName: "Codespace", icon: "Code2", color: "green" },
  jules: { displayName: "Jules", icon: "Bot", color: "purple" },
  gateway: { displayName: "Gateway", icon: "Network", color: "orange" },
  admin: { displayName: "Admin", icon: "Shield", color: "orange" },
  agents: { displayName: "Agents", icon: "Users", color: "purple" },
  "album-images": { displayName: "Album Images", icon: "ImagePlus", color: "fuchsia" },
  "album-management": { displayName: "Albums", icon: "Palette", color: "pink" },
  apps: { displayName: "Apps", icon: "AppWindow", color: "green" },
  arena: { displayName: "Arena", icon: "Sparkles", color: "purple" },
  audio: { displayName: "Audio", icon: "Music", color: "pink" },
  auth: { displayName: "Auth", icon: "Shield", color: "blue" },
  "batch-enhance": { displayName: "Batch Enhance", icon: "Zap", color: "fuchsia" },
  billing: { displayName: "Billing", icon: "CreditCard", color: "green" },
  blog: { displayName: "Blog", icon: "FileText", color: "blue" },
  bootstrap: { displayName: "Bootstrap", icon: "Rocket", color: "orange" },
  capabilities: { displayName: "Capabilities", icon: "Shield", color: "blue" },
  career: { displayName: "Career", icon: "Briefcase", color: "green" },
  chat: { displayName: "Chat", icon: "MessageSquare", color: "blue" },
  create: { displayName: "Create", icon: "PlusCircle", color: "green" },
  credits: { displayName: "Credits", icon: "Coins", color: "orange" },
  dev: { displayName: "Dev Tools", icon: "Terminal", color: "green" },
  "enhancement-jobs": { displayName: "Enhancements", icon: "Sparkles", color: "fuchsia" },
  learnit: { displayName: "Learn It", icon: "BookOpen", color: "blue" },
  "mcp-registry": { displayName: "MCP Registry", icon: "Search", color: "blue" },
  newsletter: { displayName: "Newsletter", icon: "Send", color: "blue" },
  orchestration: { displayName: "Orchestration", icon: "Network", color: "purple" },
  pipelines: { displayName: "Pipelines", icon: "GitBranch", color: "orange" },
  reports: { displayName: "Reports", icon: "FileText", color: "blue" },
  settings: { displayName: "Settings", icon: "Settings", color: "layers" },
  "skill-store": { displayName: "Skill Store", icon: "Store", color: "green" },
  tools: { displayName: "Tools", icon: "Wrench", color: "layers" },
  tts: { displayName: "Text to Speech", icon: "Volume2", color: "pink" },
  vault: { displayName: "Vault", icon: "Lock", color: "orange" },
  workspaces: { displayName: "Workspaces", icon: "FolderOpen", color: "green" },
  bazdmeg: { displayName: "BAZDMEG", icon: "FileText", color: "purple" },
};

// Tools whose response renders as an image in the playground
const IMAGE_TOOLS = new Set([
  "generate_image",
  "modify_image",
  "codespace_screenshot",
]);

// ── Derive display name from snake_case tool name ───────────────────
function toDisplayName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Build categories from manifest ──────────────────────────────────
export const MCP_CATEGORIES: McpCategory[] = toolsManifest.categories.map((cat) => {
  const meta = CATEGORY_META[cat.name];
  return {
    id: cat.name,
    name: meta?.displayName ?? toDisplayName(cat.name),
    description: cat.description,
    icon: meta?.icon ?? "Wrench",
    color: meta?.color ?? "layers",
    toolCount: cat.toolCount,
    tier: cat.tier as "free" | "workspace",
  };
});

// ── Build tools from manifest ───────────────────────────────────────
export const MCP_TOOLS: McpToolDef[] = toolsManifest.tools.map((tool) => ({
  name: tool.name,
  displayName: toDisplayName(tool.name),
  description: tool.description,
  category: tool.category,
  tier: tool.tier as "free" | "workspace",
  alwaysEnabled: tool.category === "gateway-meta" ? true : undefined,
  responseType: IMAGE_TOOLS.has(tool.name) ? "image" as const : "json" as const,
  params: tool.parameters.map((p) => ({
    name: p.name,
    type: p.type as McpToolParam["type"],
    description: p.description,
    required: p.required,
  })),
}));

// ── Helpers (same API as before) ────────────────────────────────────
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
