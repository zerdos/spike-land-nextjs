import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { resolveAIProviderConfig } from "./ai-config-resolver";

/**
 * Shared Claude (Anthropic) client singleton.
 *
 * Auth resolution: CLAUDE_CODE_OAUTH_TOKEN only.
 * Claude Max subscription provides cost-effective Opus 4.6 access
 * (OAuth bearer auth, not API key).
 */

const FALLBACK_CLI_VERSION = "2.1.42";

/** Detect installed Claude CLI version at startup; cache result. */
let _cachedCliVersion: string | undefined;
export function getClaudeCliVersion(): string {
  if (_cachedCliVersion) return _cachedCliVersion;
  try {
    const raw = execFileSync("claude", ["--version"], {
      timeout: 3000,
      encoding: "utf8",
    }).trim();
    // Output is e.g. "2.1.42 (Claude Code)" — extract semver
    const match = raw.match(/^(\d+\.\d+\.\d+)/);
    _cachedCliVersion = match?.[1] ?? FALLBACK_CLI_VERSION;
  } catch {
    _cachedCliVersion = FALLBACK_CLI_VERSION;
  }
  return _cachedCliVersion;
}

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
              "user-agent": `claude-cli/${getClaudeCliVersion()} (external, cli)`,
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
