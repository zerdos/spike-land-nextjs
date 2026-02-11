import type { APIError } from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages.js";
import { getClaudeClient } from "@/lib/ai/claude-client";

export interface ClaudeResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export type ClaudeModel = "opus" | "sonnet" | "haiku";

const MODEL_MAP: Record<ClaudeModel, string> = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-5-20250929",
  haiku: "claude-haiku-4-5-20251001",
};

import logger from "@/lib/logger";

const CLAUDE_MAX_RETRIES = 3;
const CLAUDE_RETRY_DELAYS = [1000, 2000, 4000];
/** HTTP status codes that are worth retrying (transient). */
const RETRYABLE_STATUS_CODES = new Set([429, 529]);

function isRetryableError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as APIError).status;
    return typeof status === "number" && RETRYABLE_STATUS_CODES.has(status);
  }
  return false;
}

function getRetryAfterMs(error: unknown): number | null {
  if (error && typeof error === "object" && "headers" in error) {
    const headers = (error as APIError).headers;
    const retryAfter = headers?.get?.("retry-after");
    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds) && seconds > 0 && seconds <= 30) {
        return seconds * 1000;
      }
    }
  }
  return null;
}

/**
 * Call Claude with KV cache optimization on system prompt.
 *
 * Supports split cache blocks: `stablePrefix` gets cache_control for high hit rate,
 * while `dynamicSuffix` (notes) does NOT get cached so changes don't invalidate the prefix.
 *
 * Retries on 429 (rate limit) and 529 (overloaded) with exponential backoff.
 */
export async function callClaude(params: {
  systemPrompt: string;
  stablePrefix?: string;
  dynamicSuffix?: string;
  userPrompt: string;
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
}): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    stablePrefix,
    dynamicSuffix,
    userPrompt,
    model = "opus",
    maxTokens = 32768,
    temperature = 0.5,
  } = params;

  const anthropic = getClaudeClient();

  // Build system content blocks with split caching
  const systemBlocks = buildSystemBlocks(systemPrompt, stablePrefix, dynamicSuffix);

  let lastError: unknown;

  for (let attempt = 0; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL_MAP[model],
        max_tokens: maxTokens,
        temperature,
        system: systemBlocks,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      const { usage } = response;
      const usageRecord = usage as unknown as Record<string, number | undefined>;

      return {
        text,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usageRecord["cache_read_input_tokens"] ?? 0,
        cacheCreationTokens: usageRecord["cache_creation_input_tokens"] ?? 0,
      };
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt >= CLAUDE_MAX_RETRIES) {
        throw error;
      }

      const retryAfter = getRetryAfterMs(error);
      const delay = retryAfter ?? CLAUDE_RETRY_DELAYS[attempt] ?? 4000;

      logger.warn(`Claude API call failed with retryable error (attempt ${attempt + 1}), retrying in ${delay}ms`, {
        status: (error as APIError).status,
        model,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function buildSystemBlocks(
  systemPrompt: string,
  stablePrefix?: string,
  dynamicSuffix?: string,
): Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> {
  // If split blocks are provided, use them for better cache hit rates
  if (stablePrefix) {
    const blocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> = [
      {
        type: "text",
        text: stablePrefix,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (dynamicSuffix) {
      blocks.push({ type: "text", text: dynamicSuffix });
    }
    return blocks;
  }

  // Fallback: single block with cache
  return [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];
}

/**
 * Extract raw code from a Claude response that may contain markdown fences,
 * JSON wrapping, or raw code.
 */
export function extractCodeFromResponse(text: string): string | null {
  // Try to extract from ```tsx or ```jsx fences
  const fenceMatch = text.match(
    /```(?:tsx|jsx|typescript|javascript)?\n([\s\S]*?)```/,
  );
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // Try to parse as JSON and extract code field
  try {
    const json = JSON.parse(text);
    if (typeof json.code === "string") return json.code;
  } catch {
    // Not valid JSON
  }

  // Try to find code field in partial/malformed JSON
  const codeMatch = text.match(/"code"\s*:\s*"([\s\S]+)/);
  if (codeMatch?.[1]) {
    let code = codeMatch[1];
    code = code.replace(
      /"\s*,?\s*"(relatedApps|title|description)"\s*:[\s\S]*$/,
      "",
    );
    code = code.replace(/"\s*,?\s*}\s*$/, "");
    code = code.replace(/"\s*$/, "");
    try {
      code = JSON.parse(`"${code}"`);
    } catch {
      code = code
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return code.trim() || null;
  }

  // If response looks like raw code (has import statements + default export)
  if (text.includes("import ") && text.includes("export default")) {
    return text.trim();
  }

  return null;
}

export interface ParsedGeneration {
  title: string;
  description: string;
  code: string;
  relatedApps: string[];
}

/**
 * Parse a structured generation response from Claude.
 * Expected format: JSON with { title, description, code, relatedApps }.
 * Falls back to extracting just code if JSON parsing fails.
 */
export function parseGenerationResponse(
  text: string,
  slug: string,
): ParsedGeneration | null {
  // Try to parse as clean JSON
  try {
    const json = JSON.parse(text);
    if (json.code && json.title) {
      return {
        title: json.title,
        description: json.description || "Generated application",
        code: json.code,
        relatedApps: Array.isArray(json.relatedApps) ? json.relatedApps : [],
      };
    }
  } catch {
    // Not clean JSON
  }

  // Try to find a JSON block within the response
  const jsonMatch = text.match(/\{[\s\S]*"code"\s*:\s*"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[0]);
      if (json.code) {
        return {
          title:
            json.title || slug.split("/").pop()?.replace(/-/g, " ") || "Generated App",
          description: json.description || "Generated application",
          code: json.code,
          relatedApps: Array.isArray(json.relatedApps) ? json.relatedApps : [],
        };
      }
    } catch {
      // Fall through
    }
  }

  // Extract just code and synthesize metadata
  const code = extractCodeFromResponse(text);
  if (code) {
    return {
      title: slug.split("/").pop()?.replace(/-/g, " ") || "Generated App",
      description: "Generated application",
      code,
      relatedApps: [],
    };
  }

  return null;
}
