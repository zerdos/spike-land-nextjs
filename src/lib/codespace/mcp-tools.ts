/**
 * MCP (Model Context Protocol) Tool Definitions and Execution
 *
 * Ported from packages/testing.spike.land/src/mcp/ to run inside Next.js.
 * Uses session-service (PostgreSQL + Redis) instead of Cloudflare Durable Objects.
 */

import {
  getOrCreateSession,
  upsertSession,
} from "@/lib/codespace/session-service";
import { transpileCode } from "@/lib/codespace/transpile";
import type { CodespaceSessionData } from "@/lib/codespace/types";

// ---------------------------------------------------------------------------
// MCP Protocol Types
// ---------------------------------------------------------------------------

export interface McpRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: string;
  id: string | number;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, Record<string, unknown>>;
    required?: string[];
  };
}

export interface LineEdit {
  startLine: number;
  endLine: number;
  newContent: string;
}

export interface LineMatch {
  lineNumber: number;
  content: string;
  matchText: string;
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

interface ReadCodeResult extends Record<string, unknown> {
  code: string;
  codeSpace: string;
}

interface ReadHtmlResult extends Record<string, unknown> {
  html: string;
  codeSpace: string;
}

interface ReadSessionResult extends Record<string, unknown> {
  code: string;
  html: string;
  css: string;
  codeSpace: string;
}

interface UpdateCodeResult extends Record<string, unknown> {
  success: boolean;
  message: string;
  codeSpace: string;
  requiresTranspilation: boolean;
}

interface EditCodeResult extends Record<string, unknown> {
  success: boolean;
  message: string;
  codeSpace: string;
  diff: string;
  linesChanged: number;
  requiresTranspilation: boolean;
}

interface FindLinesResult extends Record<string, unknown> {
  pattern: string;
  isRegex: boolean;
  matches: LineMatch[];
  totalMatches: number;
  codeSpace: string;
}

interface SearchReplaceResult extends Record<string, unknown> {
  success: boolean;
  message: string;
  replacements: number;
  search: string;
  replace: string;
  isRegex: boolean;
  global: boolean;
  codeSpace: string;
  requiresTranspilation: boolean;
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

const readCodeTool: McpTool = {
  name: "read_code",
  description:
    "Read current code only. Use before making changes to understand the codebase.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to read code from",
      },
    },
    required: ["codeSpace"],
  },
};

const readHtmlTool: McpTool = {
  name: "read_html",
  description:
    "Read current HTML output only. Lightweight way to check rendering results.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to read HTML from",
      },
    },
    required: ["codeSpace"],
  },
};

const readSessionTool: McpTool = {
  name: "read_session",
  description:
    "Read ALL session data (code+html+css). Use sparingly - prefer specific read tools.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to read session from",
      },
    },
    required: ["codeSpace"],
  },
};

const updateCodeTool: McpTool = {
  name: "update_code",
  description:
    "Replace ALL code with new content. For smaller changes, use edit_code or search_and_replace instead.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to update code in",
      },
      code: {
        type: "string",
        description: "The complete new code to replace ALL existing code",
      },
    },
    required: ["codeSpace", "code"],
  },
};

const editCodeTool: McpTool = {
  name: "edit_code",
  description:
    "Make precise line-based edits. More efficient than update_code for targeted changes.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to edit code in",
      },
      edits: {
        type: "array",
        description: "Array of line edits to apply",
        items: {
          type: "object",
          properties: {
            startLine: {
              type: "number",
              description: "Starting line number (1-based)",
            },
            endLine: {
              type: "number",
              description: "Ending line number (1-based)",
            },
            newContent: {
              type: "string",
              description: "New content for the specified lines",
            },
          },
          required: ["startLine", "endLine", "newContent"],
        },
      },
    },
    required: ["codeSpace", "edits"],
  },
};

const searchAndReplaceTool: McpTool = {
  name: "search_and_replace",
  description:
    "MOST EFFICIENT: Replace patterns without needing line numbers. Best for simple text replacements.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description:
          "The codeSpace identifier to perform search and replace in",
      },
      search: {
        type: "string",
        description: "Text or pattern to search for",
      },
      replace: {
        type: "string",
        description: "Replacement text",
      },
      isRegex: {
        type: "boolean",
        description:
          "Whether search is a regular expression (default: false)",
      },
      global: {
        type: "boolean",
        description: "Replace all occurrences (default: true)",
      },
    },
    required: ["codeSpace", "search", "replace"],
  },
};

const findLinesTool: McpTool = {
  name: "find_lines",
  description:
    "Find line numbers containing a search pattern. Use before edit_code to locate target lines.",
  inputSchema: {
    type: "object",
    properties: {
      codeSpace: {
        type: "string",
        description: "The codeSpace identifier to search in",
      },
      pattern: {
        type: "string",
        description: "Pattern to search for",
      },
      isRegex: {
        type: "boolean",
        description:
          "Whether pattern is a regular expression (default: false)",
      },
    },
    required: ["codeSpace", "pattern"],
  },
};

/** All 7 MCP tool definitions */
export const allTools: McpTool[] = [
  readCodeTool,
  readHtmlTool,
  readSessionTool,
  updateCodeTool,
  editCodeTool,
  searchAndReplaceTool,
  findLinesTool,
];

// ---------------------------------------------------------------------------
// Session Helper
// ---------------------------------------------------------------------------

/**
 * Persist an updated codespace session via force-upsert.
 * This replaces the Durable Object updateAndBroadcastSession call.
 */
async function updateCodespaceSession(
  _codeSpace: string,
  updatedData: CodespaceSessionData,
): Promise<void> {
  await upsertSession(updatedData);
}

// ---------------------------------------------------------------------------
// Line Edit Utility
// ---------------------------------------------------------------------------

export function applyLineEdits(
  originalCode: string,
  edits: LineEdit[],
): { newCode: string; diff: string } {
  const originalLines = originalCode.split("\n");
  const editsCopy = [...edits].sort((a, b) => b.startLine - a.startLine);

  for (const edit of editsCopy) {
    if (edit.startLine < 1 || edit.endLine < 1) {
      throw new Error("Line numbers must be 1-based and positive");
    }
    if (edit.startLine > edit.endLine) {
      throw new Error("Start line must be less than or equal to end line");
    }
    if (edit.endLine > originalLines.length) {
      throw new Error(
        `End line ${edit.endLine} exceeds code length (${originalLines.length} lines)`,
      );
    }
  }

  const sortedEdits = [...edits].sort((a, b) => a.startLine - b.startLine);
  for (let i = 1; i < sortedEdits.length; i++) {
    const currentEdit = sortedEdits[i];
    const previousEdit = sortedEdits[i - 1];
    if (!currentEdit || !previousEdit) continue;

    if (currentEdit.startLine <= previousEdit.endLine) {
      throw new Error(
        `Overlapping edits detected: lines ${previousEdit.startLine}-${previousEdit.endLine} and ${currentEdit.startLine}-${currentEdit.endLine}`,
      );
    }
  }

  const modifiedLines = [...originalLines];
  const diffParts: string[] = [];

  for (const edit of editsCopy) {
    const startIdx = edit.startLine - 1;
    const endIdx = edit.endLine - 1;
    const removedLines = modifiedLines.slice(startIdx, endIdx + 1);
    const newLines = edit.newContent ? edit.newContent.split("\n") : [];

    const contextStart = Math.max(0, startIdx - 2);
    const contextEnd = Math.min(modifiedLines.length - 1, endIdx + 2);

    const diffHeader = `@@ -${edit.startLine},${
      edit.endLine - edit.startLine + 1
    } +${edit.startLine},${newLines.length} @@`;
    const diffLines = [diffHeader];

    for (let i = contextStart; i < startIdx; i++) {
      diffLines.push(` ${modifiedLines[i]}`);
    }

    for (const line of removedLines) {
      diffLines.push(`-${line}`);
    }

    for (const line of newLines) {
      diffLines.push(`+${line}`);
    }

    for (
      let i = endIdx + 1;
      i <= Math.min(contextEnd, modifiedLines.length - 1);
      i++
    ) {
      diffLines.push(` ${modifiedLines[i]}`);
    }

    diffParts.unshift(diffLines.join("\n"));

    modifiedLines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
  }

  const newCode = modifiedLines.join("\n");
  const diff =
    diffParts.length > 0 ? diffParts.join("\n\n") : "No changes made";

  return { newCode, diff };
}

// ---------------------------------------------------------------------------
// Tool Execution Functions
// ---------------------------------------------------------------------------

function executeReadCode(
  session: CodespaceSessionData,
  codeSpace: string,
): ReadCodeResult {
  return {
    code: session.code,
    codeSpace,
  };
}

function executeReadHtml(
  session: CodespaceSessionData,
  codeSpace: string,
): ReadHtmlResult {
  return {
    html: session.html,
    codeSpace,
  };
}

function executeReadSession(
  session: CodespaceSessionData,
  codeSpace: string,
): ReadSessionResult {
  return {
    code: session.code,
    html: session.html,
    css: session.css,
    codeSpace,
  };
}

async function executeUpdateCode(
  session: CodespaceSessionData,
  codeSpace: string,
  code: string,
  origin: string,
): Promise<UpdateCodeResult> {
  let transpiled = "";
  let transpilationFailed = false;

  try {
    transpiled = await transpileCode(code, origin);
  } catch (error) {
    console.error("[MCP] Transpilation error:", error);
    transpilationFailed = true;
  }

  const updatedSession: CodespaceSessionData = {
    ...session,
    code,
    transpiled,
    html: "",
    css: "",
    codeSpace,
  };

  await updateCodespaceSession(codeSpace, updatedSession);

  return {
    success: true,
    message: transpiled
      ? `Code updated and transpiled successfully (${code.length} chars).`
      : transpilationFailed
        ? `Code updated (${code.length} chars). Transpilation failed - will retry on next load.`
        : `Code updated (${code.length} chars). Transpilation pending.`,
    codeSpace,
    requiresTranspilation: !transpiled,
  };
}

async function executeEditCode(
  session: CodespaceSessionData,
  codeSpace: string,
  edits: LineEdit[],
  origin: string,
): Promise<EditCodeResult> {
  const originalCode = session.code || "";
  const { newCode, diff } = applyLineEdits(originalCode, edits);

  let transpiled = "";
  try {
    transpiled = await transpileCode(newCode, origin);
  } catch (error) {
    console.error("[MCP] Transpilation error in edit_code:", error);
  }

  const updatedSession: CodespaceSessionData = {
    ...session,
    code: newCode,
    transpiled,
    html: "",
    css: "",
    codeSpace,
  };

  await updateCodespaceSession(codeSpace, updatedSession);

  return {
    success: true,
    message: transpiled
      ? "Code edited and transpiled successfully."
      : "Code edited. Transpilation pending.",
    codeSpace,
    diff,
    linesChanged: edits.length,
    requiresTranspilation: !transpiled,
  };
}

async function executeSearchAndReplace(
  session: CodespaceSessionData,
  codeSpace: string,
  search: string,
  replace: string,
  isRegex: boolean,
  global: boolean,
  origin: string,
): Promise<SearchReplaceResult> {
  const originalCode = session.code || "";
  let newCode: string;
  let replacements = 0;

  try {
    if (isRegex) {
      const flags = global ? "g" : "";
      const regex = new RegExp(search, flags);
      const matches = originalCode.match(new RegExp(search, "g"));
      replacements = matches ? matches.length : 0;
      newCode = originalCode.replace(regex, replace);
    } else {
      if (global) {
        const regex = new RegExp(
          search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g",
        );
        const matches = originalCode.match(regex);
        replacements = matches ? matches.length : 0;
        newCode = originalCode.replace(regex, replace);
      } else {
        const index = originalCode.indexOf(search);
        if (index !== -1) {
          replacements = 1;
          newCode =
            originalCode.substring(0, index) +
            replace +
            originalCode.substring(index + search.length);
        } else {
          replacements = 0;
          newCode = originalCode;
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (replacements > 0) {
    let transpiled = "";
    try {
      transpiled = await transpileCode(newCode, origin);
    } catch (error) {
      console.error(
        "[MCP] Transpilation error in search_and_replace:",
        error,
      );
    }

    const updatedSession: CodespaceSessionData = {
      ...session,
      code: newCode,
      transpiled,
      html: "",
      css: "",
      codeSpace,
    };

    await updateCodespaceSession(codeSpace, updatedSession);
  }

  return {
    success: true,
    message:
      replacements > 0
        ? `Made ${replacements} replacement(s). Code transpiled and updated.`
        : "No matches found",
    replacements,
    search,
    replace,
    isRegex,
    global,
    codeSpace,
    requiresTranspilation: replacements > 0 && !origin,
  };
}

function executeFindLines(
  session: CodespaceSessionData,
  codeSpace: string,
  pattern: string,
  isRegex: boolean,
): FindLinesResult {
  const code = session.code || "";
  const lines = code.split("\n");
  const matches: LineMatch[] = [];

  try {
    const searchPattern = isRegex ? new RegExp(pattern, "gi") : pattern;

    lines.forEach((line: string, index: number) => {
      const lineNumber = index + 1;
      if (isRegex) {
        const regex = searchPattern as RegExp;
        const match = line.match(regex);
        if (match) {
          matches.push({
            lineNumber,
            content: line,
            matchText: match[0],
          });
        }
      } else {
        if (line.includes(searchPattern as string)) {
          matches.push({
            lineNumber,
            content: line,
            matchText: searchPattern as string,
          });
        }
      }
    });
  } catch (error) {
    throw new Error(
      `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    pattern,
    isRegex,
    matches,
    totalMatches: matches.length,
    codeSpace,
  };
}

// ---------------------------------------------------------------------------
// Main Request Handler
// ---------------------------------------------------------------------------

/**
 * Handle an MCP JSON-RPC request for a given codeSpace.
 *
 * Dispatches `initialize`, `tools/list`, and `tools/call` methods.
 */
export async function handleMcpRequest(
  request: McpRequest,
  codeSpace: string,
  origin: string = "https://spike.land",
): Promise<McpResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: true },
            },
            serverInfo: {
              name: "spike.land-mcp-server",
              version: "1.0.1",
            },
          },
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: allTools,
          },
        };

      case "tools/call": {
        if (!params?.name || typeof params.name !== "string") {
          throw new Error("Tool name is required and must be a string");
        }
        const result = await executeTool(
          params.name,
          (params.arguments as Record<string, unknown>) || {},
          codeSpace,
          origin,
        );
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default:
        throw new Error(`Method ${method} not found`);
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Tool Dispatcher
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  codeSpace: string,
  origin: string,
): Promise<Record<string, unknown>> {
  // Use the codeSpace from the URL route; args.codeSpace is accepted for
  // compatibility but the route param takes precedence.
  const effectiveCodeSpace =
    (args.codeSpace as string) || codeSpace;

  const session = await getOrCreateSession(effectiveCodeSpace);

  console.log(
    `[MCP] Tool '${toolName}' executing for codeSpace: ${effectiveCodeSpace}`,
  );

  switch (toolName) {
    case "read_code":
      return executeReadCode(session, effectiveCodeSpace);

    case "read_html":
      return executeReadHtml(session, effectiveCodeSpace);

    case "read_session":
      return executeReadSession(session, effectiveCodeSpace);

    case "update_code": {
      if (!args.code || typeof args.code !== "string") {
        throw new Error("Code parameter is required and must be a string");
      }
      return executeUpdateCode(session, effectiveCodeSpace, args.code, origin);
    }

    case "edit_code": {
      if (!args.edits || !Array.isArray(args.edits)) {
        throw new Error("Edits parameter is required and must be an array");
      }
      return executeEditCode(
        session,
        effectiveCodeSpace,
        args.edits as LineEdit[],
        origin,
      );
    }

    case "find_lines": {
      if (!args.pattern || typeof args.pattern !== "string") {
        throw new Error(
          "Pattern parameter is required and must be a string",
        );
      }
      return executeFindLines(
        session,
        effectiveCodeSpace,
        args.pattern,
        args.isRegex === true,
      );
    }

    case "search_and_replace": {
      if (!args.search || typeof args.search !== "string") {
        throw new Error(
          "Search parameter is required and must be a string",
        );
      }
      if (typeof args.replace !== "string") {
        throw new Error(
          "Replace parameter is required and must be a string",
        );
      }
      return executeSearchAndReplace(
        session,
        effectiveCodeSpace,
        args.search,
        args.replace,
        args.isRegex === true,
        args.global !== false,
        origin,
      );
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
