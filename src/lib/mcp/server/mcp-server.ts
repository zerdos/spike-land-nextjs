/**
 * Server-Side MCP Server Factory
 *
 * Creates a configured McpServer instance with all tools registered
 * for a specific authenticated user. Used by the Streamable HTTP endpoint.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolRegistry } from "./tool-registry";
import { registerGatewayMetaTools } from "./tools/gateway-meta";
import { registerImageTools } from "./tools/image";
import { registerCodeSpaceTools } from "./tools/codespace";
import { registerJulesTools, isJulesAvailable } from "./tools/jules";
import { registerGatewayTools, isGatewayAvailable } from "./tools/gateway";
import { registerVaultTools } from "./tools/vault";
import { registerToolFactoryTools } from "./tools/tool-factory";
import { registerBootstrapTools } from "./tools/bootstrap";
import { registerAppsTools } from "./tools/apps";
import { registerArenaTools } from "./tools/arena";
import { registerAlbumImagesTools } from "./tools/album-images";
import { registerAlbumManagementTools } from "./tools/album-management";
import { registerBatchEnhanceTools } from "./tools/batch-enhance";
import { registerEnhancementJobsTools } from "./tools/enhancement-jobs";
import { registerCreateTools } from "./tools/create";
import { registerLearnItTools } from "./tools/learnit";
import { registerAdminTools } from "./tools/admin";
import { registerAuthTools } from "./tools/auth";
import { registerSkillStoreTools } from "./tools/skill-store";
import { registerWorkspacesTools } from "./tools/workspaces";
import { registerAgentManagementTools } from "./tools/agent-management";
import { registerSettingsTools } from "./tools/settings";
import { registerCreditsTools } from "./tools/credits";
import { registerBillingTools } from "./tools/billing";
import { registerPipelinesTools } from "./tools/pipelines";
import { registerBlogTools } from "./tools/blog";
import { registerReportsTools } from "./tools/reports";
import { registerAudioTools } from "./tools/audio";
import { registerChatTools } from "./tools/chat";
import { registerNewsletterTools } from "./tools/newsletter";
import { registerTtsTools } from "./tools/tts";
import { registerBazdmegFaqTools } from "./tools/bazdmeg-faq";
import { registerDevTools } from "./tools/dev";

/**
 * Create a fully configured MCP server for a specific user.
 * All tools are registered with the user's identity for authorization.
 */
export function createMcpServer(userId: string): McpServer {
  const mcpServer = new McpServer(
    {
      name: "spike-land",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    },
  );

  const registry = new ToolRegistry(mcpServer);

  // Always-on gateway meta tools (5 tools)
  registerGatewayMetaTools(registry, userId);

  // Image tools (discoverable)
  registerImageTools(registry, userId);

  // CodeSpace tools (discoverable)
  registerCodeSpaceTools(registry, userId);

  // Jules tools (discoverable, if configured)
  if (isJulesAvailable()) {
    registerJulesTools(registry, userId);
  }

  // Gateway tools (BridgeMind, GitHub, sync, Bolt — discoverable, if configured)
  if (isGatewayAvailable()) {
    registerGatewayTools(registry, userId);
  }

  // Vault tools (discoverable)
  registerVaultTools(registry, userId);

  // Tool factory tools (discoverable)
  registerToolFactoryTools(registry, userId);

  // Bootstrap tools (discoverable)
  registerBootstrapTools(registry, userId);

  // My-Apps tools (discoverable)
  registerAppsTools(registry, userId);

  // Arena tools (discoverable)
  registerArenaTools(registry, userId);

  // Album image tools (discoverable)
  registerAlbumImagesTools(registry, userId);

  // Album management tools (discoverable)
  registerAlbumManagementTools(registry, userId);

  // Batch enhance tools (discoverable)
  registerBatchEnhanceTools(registry, userId);

  // Enhancement jobs tools (discoverable)
  registerEnhancementJobsTools(registry, userId);

  // /create app generator tools (discoverable)
  registerCreateTools(registry, userId);

  // LearnIt wiki tools (discoverable)
  registerLearnItTools(registry, userId);

  // Admin tools (discoverable)
  registerAdminTools(registry, userId);

  // Auth tools (discoverable)
  registerAuthTools(registry, userId);

  // Skill store tools (discoverable)
  registerSkillStoreTools(registry, userId);

  // Workspaces tools (discoverable)
  registerWorkspacesTools(registry, userId);

  // Agent management tools (discoverable)
  registerAgentManagementTools(registry, userId);

  // Settings tools (discoverable)
  registerSettingsTools(registry, userId);

  // Credits tools (discoverable)
  registerCreditsTools(registry, userId);

  // Billing tools (discoverable)
  registerBillingTools(registry, userId);

  // Pipelines tools (discoverable)
  registerPipelinesTools(registry, userId);

  // Blog tools (discoverable)
  registerBlogTools(registry, userId);

  // Reports tools (discoverable)
  registerReportsTools(registry, userId);

  // Audio tools (discoverable)
  registerAudioTools(registry, userId);

  // Chat tools (discoverable)
  registerChatTools(registry, userId);

  // Newsletter tools (discoverable)
  registerNewsletterTools(registry, userId);

  // TTS tools (discoverable)
  registerTtsTools(registry, userId);

  // BAZDMEG FAQ tools (discoverable)
  registerBazdmegFaqTools(registry, userId);

  // Dev workflow tools (localhost only)
  if (process.env.NODE_ENV === "development") {
    registerDevTools(registry, userId);
  }

  return mcpServer;
}
