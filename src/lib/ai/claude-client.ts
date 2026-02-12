import Anthropic from "@anthropic-ai/sdk";
import { resolveAIProviderConfig } from "./ai-config-resolver";

/**
 * Shared Claude (Anthropic) client singleton.
 *
 * Auth resolution (OAuth-only):
 * 1. DB config (AIProvider table) via resolveAIProviderConfig
 * 2. CLAUDE_CODE_OAUTH_TOKEN — preferred OAuth token
 * 3. ANTHROPIC_AUTH_TOKEN — fallback OAuth token
 */

let client: Anthropic | null = null;

export async function getClaudeClient(): Promise<Anthropic> {
  if (!client) {
    const config = await resolveAIProviderConfig("anthropic");
    const authToken = config?.token ?? (process.env["CLAUDE_CODE_OAUTH_TOKEN"] ?? process.env["ANTHROPIC_AUTH_TOKEN"]);

    client = new Anthropic({
      apiKey: null,
      authToken: authToken ?? null,
      ...(authToken
        ? {
            defaultHeaders: {
              "accept": "application/json",
              "anthropic-beta":
                "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14",
              "user-agent": "claude-cli/2.1.2 (external, cli)",
              "x-app": "cli",
            },
          }
        : {}),
    });
  }
  return client;
}

export async function isClaudeConfigured(): Promise<boolean> {
  const config = await resolveAIProviderConfig("anthropic");
  return !!(
    config?.token ||
    process.env["CLAUDE_CODE_OAUTH_TOKEN"] ||
    process.env["ANTHROPIC_AUTH_TOKEN"]
  );
}

export function resetClaudeClient(): void {
  client = null;
}
