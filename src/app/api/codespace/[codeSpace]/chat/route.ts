import type Anthropic from "@anthropic-ai/sdk";
import type { TextBlock, ToolResultBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";
import { getClaudeClient, isClaudeConfigured } from "@/lib/ai/claude-client";
import { CORS_HEADERS, corsOptions } from "@/lib/codespace/cors";
import {
  getOrCreateSession,
  upsertSession,
} from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const maxDuration = 120; // 2 minutes for streaming responses

const MAX_MESSAGES_COUNT = 100;
const MAX_TOOL_ITERATIONS = 10;
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 16384;

// Valid roles for incoming messages
const VALID_ROLES = new Set(["user", "assistant"]);

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
}

// ---------------------------------------------------------------------------
// Tool definitions (matches codespace-tools.ts but executes locally)
// ---------------------------------------------------------------------------

/**
 * Anthropic-format tool definitions for the codespace MCP tools.
 * These mirror the tools in src/lib/claude-agent/tools/codespace-tools.ts
 * but are defined in the Anthropic API schema format.
 */
const CODESPACE_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_code",
    description:
      "Read the current code from the codespace. ALWAYS use this before making any changes to understand the current state.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "update_code",
    description:
      "Replace the ENTIRE code content of the file. Transpiles and saves automatically. Use this for major rewrites or when search_and_replace is too complex.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "The full new code content for the file",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "edit_code",
    description:
      "Edit specific lines of code. Use this for targeted changes when you know the line numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              startLine: {
                type: "number",
                description: "1-based line number to start editing from",
              },
              endLine: {
                type: "number",
                description:
                  "1-based line number to end editing at (inclusive)",
              },
              content: {
                type: "string",
                description: "New content to replace the lines with",
              },
            },
            required: ["startLine", "endLine", "content"],
          },
          description: "List of edits to apply",
        },
      },
      required: ["edits"],
    },
  },
  {
    name: "search_and_replace",
    description:
      "Search for a pattern and replace it. Best for small, precise changes like renaming variables or changing colors.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "The string or regex pattern to search for",
        },
        replace: {
          type: "string",
          description: "The string to replace the match with",
        },
        isRegex: {
          type: "boolean",
          description: "Whether the search pattern is a regex",
        },
      },
      required: ["search", "replace"],
    },
  },
  {
    name: "find_lines",
    description:
      "Find line numbers matching a pattern. Use this to locate code before using edit_code.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "The string pattern to search for",
        },
      },
      required: ["search"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

/**
 * Execute a codespace tool by name. Operates directly on the session
 * database via the session-service (no external HTTP calls to
 * testing.spike.land -- this IS the Next.js replacement).
 */
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  codeSpace: string,
): Promise<string> {
  switch (toolName) {
    case "read_code": {
      const session = await getOrCreateSession(codeSpace);
      return session.code;
    }

    case "update_code": {
      const code = input["code"] as string;
      if (!code) return "Error: 'code' parameter is required";

      const { data: transpiled, error: transpileError } = await tryCatch(
        transpileCode(code),
      );
      if (transpileError) {
        return `Transpilation error: ${transpileError.message}`;
      }

      const current = await getOrCreateSession(codeSpace);
      await upsertSession({
        codeSpace,
        code,
        transpiled,
        html: current.html,
        css: current.css,
        messages: current.messages,
      });
      return "success";
    }

    case "edit_code": {
      const edits = input["edits"] as Array<{
        startLine: number;
        endLine: number;
        content: string;
      }>;
      if (!edits || !Array.isArray(edits)) {
        return "Error: 'edits' parameter must be an array";
      }

      const session = await getOrCreateSession(codeSpace);
      const lines = session.code.split("\n");

      // Sort edits by startLine descending to avoid shifting
      const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);
      for (const edit of sortedEdits) {
        const start = edit.startLine - 1;
        const end = edit.endLine;
        const newLines = edit.content.split("\n");
        lines.splice(start, end - start, ...newLines);
      }

      const newCode = lines.join("\n");

      const { data: transpiled, error: transpileError } = await tryCatch(
        transpileCode(newCode),
      );
      if (transpileError) {
        return `Transpilation error: ${transpileError.message}`;
      }

      await upsertSession({
        codeSpace,
        code: newCode,
        transpiled,
        html: session.html,
        css: session.css,
        messages: session.messages,
      });
      return "success";
    }

    case "search_and_replace": {
      const search = input["search"] as string;
      const replace = input["replace"] as string;
      const isRegex = input["isRegex"] as boolean | undefined;

      if (!search) return "Error: 'search' parameter is required";
      if (replace === undefined) {
        return "Error: 'replace' parameter is required";
      }

      const session = await getOrCreateSession(codeSpace);
      let newCode: string;

      if (isRegex) {
        const regex = new RegExp(search, "g");
        newCode = session.code.replace(regex, replace);
      } else {
        newCode = session.code.split(search).join(replace);
      }

      if (newCode === session.code) {
        return "No matches found for the search pattern";
      }

      const { data: transpiled, error: transpileError } = await tryCatch(
        transpileCode(newCode),
      );
      if (transpileError) {
        return `Transpilation error: ${transpileError.message}`;
      }

      await upsertSession({
        codeSpace,
        code: newCode,
        transpiled,
        html: session.html,
        css: session.css,
        messages: session.messages,
      });
      return "success";
    }

    case "find_lines": {
      const search = input["search"] as string;
      if (!search) return "Error: 'search' parameter is required";

      const session = await getOrCreateSession(codeSpace);
      const lines = session.code.split("\n");
      const matches: Array<{ line: number; content: string }> = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes(search)) {
          matches.push({ line: i + 1, content: lines[i]! });
        }
      }

      if (matches.length === 0) return "No matches found";
      return matches.map((m) => `Line ${m.line}: ${m.content}`).join("\n");
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for the codespace chat.
 * Reuses the same knowledge base as CODESPACE_SYSTEM_PROMPT from
 * src/lib/claude-agent/prompts/codespace-system.ts but includes
 * the current code inline so the model can skip the read_code call.
 */
function buildSystemPrompt(codeSpace: string, currentCode: string): string {
  return `You are a spike.land expert -- an AI specialized in creating and modifying React components for the spike.land codeSpace system.

## YOUR EXPERTISE
- Tailwind CSS styling (REQUIRED - never use inline styles)
- React functional components with hooks
- Framer Motion animations
- Lucide React icons
- Cross-codeSpace imports via /live/{codeSpace}

## CRITICAL RULES
1. ALWAYS export default function component
2. ONLY use Tailwind CSS classes, NEVER inline styles (style={{}} is forbidden)
3. DARK MODE IS MANDATORY -- use semantic classes: text-foreground, bg-background, bg-card, text-muted-foreground, border-border. If custom colors, ALWAYS pair with dark: variant.
4. React hooks work without imports (useState, useEffect, useCallback, useMemo are available)
5. npm packages auto-transform to CDN URLs
6. Never use setTimeout/setInterval with functions that read React state
7. Limit icon imports to 6-8 icons maximum per component

## CODE FORMAT
The codespace expects a single default export:
\`\`\`tsx
import React, { useState, useEffect } from "react";
export default function App() {
  const [state, setState] = useState(initial);
  return <div className="p-4">Your UI</div>;
}
\`\`\`

## SHADCN/UI DESIGN SYSTEM (import from "@/components/ui/...")
Available components: Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Label, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, Select, Checkbox, Switch, Slider, Progress, Tooltip, Accordion, Alert, Separator, ScrollArea, Skeleton, Table, DropdownMenu, Sheet, Avatar, Calendar, Drawer, Toggle, ToggleGroup, RadioGroup, Textarea, Form, Pagination.

## PRE-LOADED LIBRARIES
- react, react-dom, tailwindcss, lucide-react, framer-motion, clsx, tailwind-merge

## CDN-AVAILABLE LIBRARIES
recharts, date-fns, zustand, react-hook-form, zod, sonner, react-markdown, canvas-confetti, @dnd-kit/core, @dnd-kit/sortable, roughjs, howler, lodash, axios, three

## AVAILABLE TOOLS
- read_code: Get current code
- update_code: Full replacement (for complete rewrites only)
- edit_code: Line-based edits (good for targeted changes)
- search_and_replace: Pattern matching (MOST EFFICIENT for small changes)
- find_lines: Locate code patterns before editing

## WORKFLOW
1. You already have the current code below. Use it directly.
2. Make precise changes using search_and_replace (most efficient) or edit_code.
3. For major rewrites only: use update_code.
4. Verify success - preview updates automatically in real-time.

## EXECUTION STYLE
1. Be AGGRESSIVE with tool use. Don't ask permission, just execute.
2. Read code, understand context, make changes in ONE turn.
3. Always provide working code - no placeholders or TODOs.
4. After making changes, briefly confirm what you did.

## CURRENT CONTEXT
- CodeSpace: ${codeSpace}

## CURRENT CODE
\`\`\`tsx
${currentCode}
\`\`\`
`;
}

// ---------------------------------------------------------------------------
// Message validation
// ---------------------------------------------------------------------------

function validateMessages(
  messages: unknown,
): { valid: true; messages: ChatMessage[] } | { valid: false; error: string } {
  if (!messages || !Array.isArray(messages)) {
    return { valid: false, error: "messages must be a non-empty array" };
  }
  if (messages.length === 0) {
    return { valid: false, error: "messages array cannot be empty" };
  }
  if (messages.length > MAX_MESSAGES_COUNT) {
    return {
      valid: false,
      error: `Too many messages (max ${MAX_MESSAGES_COUNT})`,
    };
  }

  const validated: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") {
      return { valid: false, error: `Message at index ${i} must be an object` };
    }

    const { role, content } = msg as Record<string, unknown>;
    if (!role || typeof role !== "string" || !VALID_ROLES.has(role)) {
      return {
        valid: false,
        error: `Message at index ${i} has invalid role (expected "user" or "assistant")`,
      };
    }

    // Support both string content and parts-based content
    let textContent: string;
    if (typeof content === "string") {
      textContent = content;
    } else if (Array.isArray((msg as Record<string, unknown>)["parts"])) {
      // Extract text from parts array (frontend format)
      const parts = (msg as Record<string, unknown>)["parts"] as Array<{
        type: string;
        text?: string;
      }>;
      textContent = parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text!)
        .join("");
    } else {
      return {
        valid: false,
        error: `Message at index ${i} must have string 'content' or 'parts' array`,
      };
    }

    validated.push({ role: role as "user" | "assistant", content: textContent });
  }

  return { valid: true, messages: validated };
}

// ---------------------------------------------------------------------------
// SSE streaming helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function sseEvent(
  type: string,
  data: Record<string, unknown>,
): Uint8Array {
  return encoder.encode(
    `data: ${JSON.stringify({ type, ...data })}\n\n`,
  );
}

// ---------------------------------------------------------------------------
// POST /api/codespace/[codeSpace]/chat
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ codeSpace: string }> },
) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Resolve route params
  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return Response.json(
      { error: "Invalid route parameters" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { codeSpace } = params;

  // Check Claude is configured
  if (!(await isClaudeConfigured())) {
    return Response.json(
      {
        error:
          "Claude API not configured. Set CLAUDE_CODE_OAUTH_TOKEN.",
      },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(
    request.json() as Promise<ChatRequestBody>,
  );
  if (bodyError) {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Validate messages
  const validation = validateMessages(body.messages);
  if (!validation.valid) {
    return Response.json(
      { error: validation.error },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const messages = validation.messages;
  const model = body.model || DEFAULT_MODEL;

  // Load the current codespace session for context
  const { data: session, error: sessionError } = await tryCatch(
    getOrCreateSession(codeSpace),
  );
  if (sessionError) {
    console.error(
      `[chat][${requestId}] Failed to load session for "${codeSpace}":`,
      sessionError,
    );
    return Response.json(
      { error: "Failed to load codespace session" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const systemPrompt = buildSystemPrompt(codeSpace, session.code);

  console.log(
    `[chat][${requestId}] Starting chat for codeSpace="${codeSpace}" model=${model} messages=${messages.length}`,
  );

  // Build the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit initialize stage
        controller.enqueue(sseEvent("stage", { stage: "initialize" }));

        const anthropic = await getClaudeClient();

        // Convert our simplified messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map(
          (msg) => ({
            role: msg.role,
            content: msg.content,
          }),
        );

        // Agentic tool loop: send messages, handle tool_use, repeat
        let iteration = 0;

        while (iteration < MAX_TOOL_ITERATIONS) {
          iteration++;

          controller.enqueue(
            sseEvent("stage", { stage: "processing" }),
          );

          // Stream the response from Claude
          const { data: response, error: apiError } = await tryCatch(
            anthropic.messages.create({
              model,
              max_tokens: MAX_TOKENS,
              system: systemPrompt,
              messages: anthropicMessages,
              tools: CODESPACE_TOOLS,
              tool_choice: { type: "auto" },
            }),
          );

          if (apiError) {
            console.error(
              `[chat][${requestId}] Anthropic API error:`,
              apiError,
            );
            controller.enqueue(
              sseEvent("error", {
                content: apiError instanceof Error
                  ? apiError.message
                  : "Claude API error",
              }),
            );
            break;
          }

          // Check if the response contains tool use blocks
          const toolUseBlocks = response.content.filter(
            (block): block is ToolUseBlock => block.type === "tool_use",
          );
          const textBlocks = response.content.filter(
            (block): block is TextBlock => block.type === "text",
          );

          // Stream text blocks to the client
          for (const textBlock of textBlocks) {
            if (textBlock.text) {
              controller.enqueue(
                sseEvent("chunk", { content: textBlock.text }),
              );
            }
          }

          // If no tool use, we are done
          if (toolUseBlocks.length === 0) {
            break;
          }

          // Execute tools and build tool results
          // First, append the assistant message (with tool_use blocks) to the conversation
          anthropicMessages.push({
            role: "assistant",
            content: response.content,
          });

          const toolResults: ToolResultBlockParam[] = [];

          for (const toolBlock of toolUseBlocks) {
            console.log(
              `[chat][${requestId}] Executing tool: ${toolBlock.name}`,
            );

            controller.enqueue(
              sseEvent("stage", {
                stage: "executing_tool",
                tool: toolBlock.name,
              }),
            );
            controller.enqueue(
              sseEvent("status", {
                content: `Executing ${toolBlock.name}...`,
              }),
            );

            const { data: toolResult, error: toolError } = await tryCatch(
              executeTool(
                toolBlock.name,
                toolBlock.input as Record<string, unknown>,
                codeSpace,
              ),
            );

            const resultText = toolError
              ? `Error: ${toolError instanceof Error ? toolError.message : "Unknown error"}`
              : toolResult;

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: resultText,
            });
          }

          // Append tool results and loop
          anthropicMessages.push({
            role: "user",
            content: toolResults,
          });

          // If stop_reason is "end_turn", Claude decided to stop after emitting
          // tool_use + text. We already streamed the text; let the loop run once
          // more so Claude can produce a final summary after seeing the tool results.
          if (response.stop_reason === "end_turn") {
            // One more iteration to get the final response after tools complete
            continue;
          }
        }

        // Emit complete stage
        controller.enqueue(sseEvent("stage", { stage: "complete" }));
        controller.close();
      } catch (error) {
        console.error(`[chat][${requestId}] Stream error:`, error);
        controller.enqueue(
          sseEvent("error", {
            content: error instanceof Error ? error.message : "Unknown error",
          }),
        );
        controller.enqueue(sseEvent("stage", { stage: "error" }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// OPTIONS (CORS preflight)
// ---------------------------------------------------------------------------

export function OPTIONS() {
  return corsOptions();
}
