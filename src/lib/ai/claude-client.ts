import Anthropic from "@anthropic-ai/sdk";
import { resolveAIProviderConfig } from "./ai-config-resolver";

/**
 * Shared Claude (Anthropic) client singleton.
 *
 * Auth resolution: CLAUDE_CODE_OAUTH_TOKEN only.
 * Claude Max subscription provides cost-effective Opus 4.6 access
 * (OAuth bearer auth, not API key).
 */

let client: Anthropic | null = null;

export async function getClaudeClient(): Promise<Anthropic> {
  if (!client) {
    const config = await resolveAIProviderConfig("anthropic");
    const authToken = config?.token ?? process.env["CLAUDE_CODE_OAUTH_TOKEN"];

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
    process.env["CLAUDE_CODE_OAUTH_TOKEN"]
  );
}

export function resetClaudeClient(): void {
  client = null;
}
