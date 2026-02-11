import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Claude (Anthropic) client singleton.
 *
 * Auth resolution (OAuth-only):
 * 1. ANTHROPIC_AUTH_TOKEN — SDK-native OAuth token (Authorization: Bearer)
 * 2. CLAUDE_CODE_OAUTH_TOKEN — alias for OAuth token
 */

let client: Anthropic | null = null;

function resolveAuth(): { authToken?: string } {
  const authToken =
    process.env["ANTHROPIC_AUTH_TOKEN"] ?? process.env["CLAUDE_CODE_OAUTH_TOKEN"];
  if (authToken) return { authToken };

  return {};
}

export function getClaudeClient(): Anthropic {
  if (!client) {
    const { authToken } = resolveAuth();

    client = new Anthropic({
      apiKey: null,
      authToken: authToken ?? null,
      ...(authToken
        ? { defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" } }
        : {}),
    });
  }
  return client;
}

export function isClaudeConfigured(): boolean {
  return !!(
    process.env["ANTHROPIC_AUTH_TOKEN"] ||
    process.env["CLAUDE_CODE_OAUTH_TOKEN"]
  );
}

export function resetClaudeClient(): void {
  client = null;
}
