/**
 * Factory for creating BridgeMind and GitHub sync clients.
 *
 * Wraps the MCP server client constructors so route handlers can import
 * from a path that vitest can mock via the @/ alias.
 */

import { BridgeMindClient } from "../../../packages/mcp-server/src/clients/bridgemind-client";
import { GitHubProjectsClient } from "../../../packages/mcp-server/src/clients/github-projects-client";

export function createBridgeMindClient() {
  return new BridgeMindClient();
}

export function createGitHubProjectsClient() {
  return new GitHubProjectsClient();
}
