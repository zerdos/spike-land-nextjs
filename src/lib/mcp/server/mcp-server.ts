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

  return mcpServer;
}
