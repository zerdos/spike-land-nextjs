import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const MCP_ENDPOINT = "https://testing.spike.land/mcp";

/**
 * Call an MCP tool on the testing.spike.land backend
 */
async function callMcpTool(
  codespaceId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const payload = {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  try {
    const response = await fetch(`${MCP_ENDPOINT}?codespaceId=${codespaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return `Error calling tool ${toolName}: ${response.status} ${response.statusText} - ${text}`;
    }

    const data = await response.json();

    if (data.error) {
      return `Tool execution error: ${JSON.stringify(data.error)}`;
    }

    // MCP result structure: { result: { content: [{ type: "text", text: "..." }] } }
    if (data.result && data.result.content) {
      return data.result.content
        .filter((c: { type: string; }) => c.type === "text")
        .map((c: { text: string; }) => c.text)
        .join("\n");
    }

    return JSON.stringify(data.result);
  } catch (error) {
    return `Network error calling tool ${toolName}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

/**
 * Create an MCP server with codespace tools for the given codespaceId
 */
export function createCodespaceServer(codespaceId: string) {
  return createSdkMcpServer({
    name: "codespace",
    version: "1.0.0",
    tools: [
      tool(
        "read_code",
        "Read the current code from the codespace. ALWAYS use this before making any changes to understand the current state.",
        {},
        async () => {
          const result = await callMcpTool(codespaceId, "read_code", {});
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "update_code",
        "Replace the ENTIRE code content of the file. Use this for major rewrites or when search_and_replace is too complex.",
        { code: z.string().describe("The full new code content for the file") },
        async (args) => {
          const result = await callMcpTool(codespaceId, "update_code", args);
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "edit_code",
        "Edit specific lines of code. Use this for targeted changes when you know the line numbers.",
        {
          edits: z.array(
            z.object({
              startLine: z.number().describe("1-based line number to start editing from"),
              endLine: z.number().describe("1-based line number to end editing at (inclusive)"),
              content: z.string().describe("New content to replace the lines with"),
            }),
          ).describe("List of edits to apply"),
        },
        async (args) => {
          const result = await callMcpTool(codespaceId, "edit_code", args);
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "search_and_replace",
        "Search for a pattern and replace it. Best for small, precise changes like renaming variables or changing colors.",
        {
          search: z.string().describe("The string or regex pattern to search for"),
          replace: z.string().describe("The string to replace the match with"),
          isRegex: z.boolean().optional().describe("Whether the search pattern is a regex"),
        },
        async (args) => {
          const result = await callMcpTool(codespaceId, "search_and_replace", args);
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "find_lines",
        "Find line numbers matching a pattern. Use this to locate code before using edit_code.",
        { search: z.string().describe("The string pattern to search for") },
        async (args) => {
          const result = await callMcpTool(codespaceId, "find_lines", args);
          return { content: [{ type: "text", text: result }] };
        },
      ),
    ],
  });
}

/**
 * Tool names in the format expected by allowedTools option
 */
export const CODESPACE_TOOL_NAMES = [
  "mcp__codespace__read_code",
  "mcp__codespace__update_code",
  "mcp__codespace__edit_code",
  "mcp__codespace__search_and_replace",
  "mcp__codespace__find_lines",
];
