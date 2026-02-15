/**
 * Server-Side MCP Server Factory
 *
 * Creates a configured McpServer instance with all tools registered
 * for a specific authenticated user. Used by the Streamable HTTP endpoint.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolRegistry } from "./tool-registry";
import { CapabilityFilteredRegistry } from "./capability-filtered-registry";
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
import { registerCareerTools } from "./tools/career";
import { registerReportsTools } from "./tools/reports";
import { registerAudioTools } from "./tools/audio";
import { registerChatTools } from "./tools/chat";
import { registerNewsletterTools } from "./tools/newsletter";
import { registerTtsTools } from "./tools/tts";
import { registerBazdmegFaqTools } from "./tools/bazdmeg-faq";
import { registerCapabilitiesTools } from "./tools/capabilities";
import { registerDevTools } from "./tools/dev";
import { registerContextArchitectTools } from "./tools/context-architect";
import { registerSandboxTools } from "./tools/sandbox";
import { registerOrchestratorTools } from "./tools/orchestrator";
import { registerLieDetectorTools } from "./tools/lie-detector";
import { registerReqInterviewTools } from "./tools/req-interview";
import { registerCodebaseExplainTools } from "./tools/codebase-explain";
import { registerDecisionsTools } from "./tools/decisions";
import { registerMcpRegistryTools } from "./tools/mcp-registry";
import { registerSwarmTools } from "./tools/swarm";
import { registerDashboardTools } from "./tools/dashboard";
import { registerEnvironmentTools } from "./tools/environment";
import { registerSentryBridgeTools } from "./tools/sentry-bridge";
import { registerVercelBridgeTools } from "./tools/vercel-bridge";
import { registerGitHubAdminTools } from "./tools/github-admin";

// Orbit core tools (Tier 1)
import { registerSocialAccountsTools } from "./tools/social-accounts";
import { registerPulseTools } from "./tools/pulse";
import { registerInboxTools } from "./tools/inbox";
import { registerRelayTools } from "./tools/relay";
import { registerAllocatorTools } from "./tools/allocator";
import { registerBrandBrainTools } from "./tools/brand-brain";
import { registerScoutTools } from "./tools/scout";

// Orbit growth tools (Tier 2)
import { registerCalendarTools } from "./tools/calendar";
import { registerBoostTools } from "./tools/boost";
import { registerCreativeTools } from "./tools/creative";
import { registerAbTestingTools } from "./tools/ab-testing";
import { registerCrisisTools } from "./tools/crisis";
import { registerMerchTools } from "./tools/merch";

// Platform infrastructure tools (Tier 3)
import { registerTrackingTools } from "./tools/tracking";
import { registerWorkflowsTools } from "./tools/workflows";
import { registerAssetsTools } from "./tools/assets";
import { registerEmailTools } from "./tools/email";
import { registerAgencyTools } from "./tools/agency";
import { registerAuditTools } from "./tools/audit";
import { registerNotificationsTools } from "./tools/notifications";

/**
 * Options for creating an MCP server with capability restrictions.
 * When capabilityTokenId is provided, all tool calls are filtered
 * through the capability evaluator.
 */
export interface CreateMcpServerOptions {
  capabilityTokenId?: string;
  agentId?: string;
}

/**
 * Create a fully configured MCP server for a specific user.
 * All tools are registered with the user's identity for authorization.
 *
 * When `options.capabilityTokenId` is provided, tools are wrapped with
 * capability evaluation, audit logging, and budget deduction.
 * Without it, behavior is identical to before (full access).
 */
export function createMcpServer(
  userId: string,
  options?: CreateMcpServerOptions,
): McpServer {
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

  const registry = options?.capabilityTokenId
    ? new CapabilityFilteredRegistry(
        mcpServer,
        options.capabilityTokenId,
        options.agentId ?? "",
        userId,
      )
    : new ToolRegistry(mcpServer);

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

  // Career tools (discoverable)
  registerCareerTools(registry, userId);

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

  // Capabilities tools (discoverable)
  registerCapabilitiesTools(registry, userId);

  // Orchestration tools (cloud-native code orchestration)
  registerContextArchitectTools(registry, userId);
  registerSandboxTools(registry, userId);
  registerOrchestratorTools(registry, userId);
  registerLieDetectorTools(registry, userId);
  registerReqInterviewTools(registry, userId);
  registerCodebaseExplainTools(registry, userId);
  registerDecisionsTools(registry, userId);

  // MCP Registry tools (discoverable)
  registerMcpRegistryTools(registry, userId);

  // Swarm dashboard tools (discoverable)
  registerSwarmTools(registry, userId);
  registerDashboardTools(registry, userId);
  registerEnvironmentTools(registry, userId);

  // External service bridge tools (conditional on env vars)
  if (process.env.SENTRY_MCP_AUTH_TOKEN) {
    registerSentryBridgeTools(registry, userId);
  }
  if (process.env["VERCEL_TOKEN"]) {
    registerVercelBridgeTools(registry, userId);
  }
  if (process.env.GH_PAT_TOKEN) {
    registerGitHubAdminTools(registry, userId);
  }

  // Orbit core tools — Tier 1 (agent-native social management)
  registerSocialAccountsTools(registry, userId);
  registerPulseTools(registry, userId);
  registerInboxTools(registry, userId);
  registerRelayTools(registry, userId);
  registerAllocatorTools(registry, userId);
  registerBrandBrainTools(registry, userId);
  registerScoutTools(registry, userId);

  // Orbit growth tools — Tier 2 (monetization & content optimization)
  registerCalendarTools(registry, userId);
  registerBoostTools(registry, userId);
  registerCreativeTools(registry, userId);
  registerAbTestingTools(registry, userId);
  registerCrisisTools(registry, userId);
  registerMerchTools(registry, userId);

  // Platform infrastructure tools — Tier 3
  registerTrackingTools(registry, userId);
  registerWorkflowsTools(registry, userId);
  registerAssetsTools(registry, userId);
  registerEmailTools(registry, userId);
  registerAgencyTools(registry, userId);
  registerAuditTools(registry, userId);
  registerNotificationsTools(registry, userId);

  // Dev workflow tools (localhost only)
  if (process.env.NODE_ENV === "development") {
    registerDevTools(registry, userId);
  }

  return mcpServer;
}
