import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages.js";

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

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Call Claude with KV cache optimization on system prompt.
 * The system prompt is marked as cacheable — identical prefixes across
 * calls will hit the KV cache (10x cheaper input tokens per the docs).
 */
export async function callClaude(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
}): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    userPrompt,
    model = "opus",
    maxTokens = 32768,
    temperature = 0.5,
  } = params;

  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL_MAP[model],
    max_tokens: maxTokens,
    temperature,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const { usage } = response;
  // Cache token fields are present on the usage object but may not be in the SDK types
  const usageRecord = usage as unknown as Record<string, number | undefined>;

  return {
    text,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usageRecord["cache_read_input_tokens"] ?? 0,
    cacheCreationTokens: usageRecord["cache_creation_input_tokens"] ?? 0,
  };
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
