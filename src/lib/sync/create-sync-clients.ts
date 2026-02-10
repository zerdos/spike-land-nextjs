/**
 * Factory for creating BridgeMind and GitHub sync clients.
 *
 * Wraps the client constructors so route handlers can import
 * from a path that vitest can mock via the @/ alias.
 */

import { getBridgeMindClient } from "./clients/bridgemind-client";
import { GitHubProjectsClient } from "./clients/github-projects-client";

export function createBridgeMindClient() {
  return getBridgeMindClient();
}

export function createGitHubProjectsClient() {
  return new GitHubProjectsClient();
}
