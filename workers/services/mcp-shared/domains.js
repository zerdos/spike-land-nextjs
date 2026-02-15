// MCP Shared - Domain registry
// Maps each tool domain to its metadata, service binding name, and tool count.

export const DOMAIN_REGISTRY = {
  image: {
    name: "image",
    displayName: "Image & Enhancement",
    description: "AI image generation, modification, enhancement, batch processing, and pipelines",
    binding: "MCP_IMAGE",
    toolCount: 16,
  },
  apps: {
    name: "apps",
    displayName: "Apps & Codespace",
    description: "App lifecycle, code playground, /create generator, and prompt arena",
    binding: "MCP_APPS",
    toolCount: 32,
  },
  social: {
    name: "social",
    displayName: "Social & Publishing",
    description: "Social accounts, inbox, scheduling, content drafts, and crisis management",
    binding: "MCP_SOCIAL",
    toolCount: 26,
  },
  analytics: {
    name: "analytics",
    displayName: "Analytics & Optimization",
    description: "Health monitoring, A/B testing, content optimization, and engagement tracking",
    binding: "MCP_ANALYTICS",
    toolCount: 25,
  },
  brand: {
    name: "brand",
    displayName: "Brand & Listening",
    description: "Brand voice, social listening, ad budget allocation, and agency tools",
    binding: "MCP_BRAND",
    toolCount: 21,
  },
  pages: {
    name: "pages",
    displayName: "Dynamic Pages",
    description: "Page builder with AI generation, blocks, themes, and layout suggestions",
    binding: "MCP_PAGES",
    toolCount: 18,
  },
  media: {
    name: "media",
    displayName: "Media & Assets",
    description: "Photos, albums, gallery, audio, file assets, and storage",
    binding: "MCP_MEDIA",
    toolCount: 23,
  },
  knowledge: {
    name: "knowledge",
    displayName: "Knowledge & Learning",
    description: "Wiki, blog, career guidance, and methodology reference",
    binding: "MCP_KNOWLEDGE",
    toolCount: 18,
  },
  orchestration: {
    name: "orchestration",
    displayName: "Code Orchestration",
    description: "Context packing, sandboxed execution, verification, interviews, and decisions",
    binding: "MCP_ORCHESTRATION",
    toolCount: 26,
  },
  agents: {
    name: "agents",
    displayName: "Agent Management",
    description: "Agent lifecycle, swarms, permissions, Jules coding agent, skills, and tool factory",
    binding: "MCP_AGENTS",
    toolCount: 32,
  },
  workspace: {
    name: "workspace",
    displayName: "Workspace & Admin",
    description: "Workspaces, admin dashboard, settings, permissions, vault, bootstrap, and environment",
    binding: "MCP_WORKSPACE",
    toolCount: 55,
  },
  billing: {
    name: "billing",
    displayName: "Billing & Commerce",
    description: "Credits, Stripe checkout, subscriptions, and merchandise",
    binding: "MCP_BILLING",
    toolCount: 8,
  },
  comms: {
    name: "comms",
    displayName: "Communications",
    description: "Chat, email, newsletter, text-to-speech, and notifications",
    binding: "MCP_COMMS",
    toolCount: 11,
  },
  devops: {
    name: "devops",
    displayName: "DevOps & Integrations",
    description: "Dev workflow, BridgeMind, GitHub, Sentry, Vercel, CI/CD, audit, and MCP registry",
    binding: "MCP_DEVOPS",
    toolCount: 44,
  },
};

export const DOMAIN_LIST = Object.values(DOMAIN_REGISTRY);
