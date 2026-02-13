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
import { registerOrbitWorkspaceTools } from "./tools/orbit-workspace";
import { registerOrbitInboxTools } from "./tools/orbit-inbox";
import { registerOrbitRelayTools } from "./tools/orbit-relay";
import { registerArenaTools } from "./tools/arena";
import { registerAlbumImagesTools } from "./tools/album-images";
import { registerAlbumManagementTools } from "./tools/album-management";
import { registerBatchEnhanceTools } from "./tools/batch-enhance";
import { registerEnhancementJobsTools } from "./tools/enhancement-jobs";
import { registerCreateTools } from "./tools/create";
import { registerLearnItTools } from "./tools/learnit";
import { registerAdminTools } from "./tools/admin";
import { registerAuthTools } from "./tools/auth";
import { registerPixelTools } from "./tools/pixel";
import { registerOrbitAllocatorTools } from "./tools/orbit-allocator";
import { registerOrbitCalendarTools } from "./tools/orbit-calendar";
import { registerOrbitSocialTools } from "./tools/orbit-social";
import { registerCanvasTools } from "./tools/canvas";
import { registerMerchTools } from "./tools/merch";
import { registerTabletopTools } from "./tools/tabletop";
import { registerBrandBrainTools } from "./tools/brand-brain";
import { registerConnectionsTools } from "./tools/connections";
import { registerBoxesTools } from "./tools/boxes";
import { registerSmartRoutingTools } from "./tools/smart-routing";

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

  // Orbit workspace tools (discoverable)
  registerOrbitWorkspaceTools(registry, userId);

  // Orbit inbox tools (discoverable)
  registerOrbitInboxTools(registry, userId);

  // Orbit relay tools (discoverable)
  registerOrbitRelayTools(registry, userId);

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

  // Pixel tools (discoverable)
  registerPixelTools(registry, userId);

  // Orbit allocator tools (discoverable)
  registerOrbitAllocatorTools(registry, userId);

  // Orbit calendar tools (discoverable)
  registerOrbitCalendarTools(registry, userId);

  // Orbit social tools (discoverable)
  registerOrbitSocialTools(registry, userId);

  // Canvas tools (discoverable)
  registerCanvasTools(registry, userId);

  // Merch tools (discoverable)
  registerMerchTools(registry, userId);

  // Tabletop tools (discoverable)
  registerTabletopTools(registry, userId);

  // Brand Brain tools (discoverable)
  registerBrandBrainTools(registry, userId);

  // Connections tools (discoverable)
  registerConnectionsTools(registry, userId);

  // Boxes tools (discoverable)
  registerBoxesTools(registry, userId);

  // Smart routing tools (discoverable)
  registerSmartRoutingTools(registry, userId);

  return mcpServer;
}
