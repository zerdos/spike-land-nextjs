import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Claude (Anthropic) client singleton.
 *
 * Auth resolution priority:
 * 1. ANTHROPIC_API_KEY — standard persistent key (x-api-key header)
 * 2. ANTHROPIC_AUTH_TOKEN — SDK-native OAuth token (Authorization: Bearer)
 * 3. CLAUDE_CODE_OAUTH_TOKEN — legacy alias for OAuth token
 */

let client: Anthropic | null = null;

function resolveAuth(): { apiKey?: string; authToken?: string } {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey) return { apiKey };

  const authToken =
    process.env["ANTHROPIC_AUTH_TOKEN"] ?? process.env["CLAUDE_CODE_OAUTH_TOKEN"];
  if (authToken) return { authToken };

  return {};
}

export function getClaudeClient(): Anthropic {
  if (!client) {
    const { apiKey, authToken } = resolveAuth();

    client = new Anthropic({
      apiKey: apiKey ?? null,
      authToken: authToken ?? null,
      ...(authToken && !apiKey
        ? { defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" } }
        : {}),
    });
  }
  return client;
}

export function isClaudeConfigured(): boolean {
  return !!(
    process.env["ANTHROPIC_API_KEY"] ||
    process.env["ANTHROPIC_AUTH_TOKEN"] ||
    process.env["CLAUDE_CODE_OAUTH_TOKEN"]
  );
}

export function resetClaudeClient(): void {
  client = null;
}
