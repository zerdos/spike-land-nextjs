import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const TESTING_SPIKE_LAND = "https://testing.spike.land";

/**
 * Read the current code from the codespace via REST API
 */
async function readCode(codespaceId: string): Promise<string> {
  console.log(`[codespace-tools] readCode called for: ${codespaceId}`);

  try {
    const response = await fetch(
      `${TESTING_SPIKE_LAND}/live/${codespaceId}/session.json`,
      {
        headers: { Accept: "application/json" },
      },
    );

    console.log(`[codespace-tools] readCode response status: ${response.status}`);

    if (!response.ok) {
      const error = `Error reading code: ${response.status} ${response.statusText}`;
      console.error(`[codespace-tools] ${error}`);
      return error;
    }

    const data = await response.json();
    const code = data.code || "";
    console.log(`[codespace-tools] readCode success, code length: ${code.length}`);
    return code;
  } catch (error) {
    const msg = `Network error reading code: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(`[codespace-tools] ${msg}`);
    return msg;
  }
}

/**
 * Update the entire code via REST API
 */
async function updateCode(
  codespaceId: string,
  code: string,
): Promise<string> {
  console.log(`[codespace-tools] updateCode called for: ${codespaceId}`);
  console.log(`[codespace-tools] updateCode code length: ${code.length}`);

  try {
    const url = `${TESTING_SPIKE_LAND}/live/${codespaceId}/api/code`;
    console.log(`[codespace-tools] updateCode PUT to: ${url}`);

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, run: true }),
    });

    console.log(`[codespace-tools] updateCode response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      const error = `Error updating code: ${response.status} ${response.statusText} - ${text}`;
      console.error(`[codespace-tools] ${error}`);
      return error;
    }

    const data = await response.json();
    console.log(`[codespace-tools] updateCode response data:`, JSON.stringify(data));

    if (data.success) {
      console.log(`[codespace-tools] updateCode SUCCESS for: ${codespaceId}`);
      return "success";
    }

    const error = `Update failed: ${JSON.stringify(data)}`;
    console.error(`[codespace-tools] ${error}`);
    return error;
  } catch (error) {
    const msg = `Network error updating code: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(`[codespace-tools] ${msg}`);
    return msg;
  }
}

/**
 * Edit specific lines of code
 */
async function editCode(
  codespaceId: string,
  edits: Array<{ startLine: number; endLine: number; content: string; }>,
): Promise<string> {
  console.log(`[codespace-tools] editCode called for: ${codespaceId}`);
  console.log(`[codespace-tools] editCode edits:`, JSON.stringify(edits));

  // First read the current code
  const currentCode = await readCode(codespaceId);
  if (currentCode.startsWith("Error") || currentCode.startsWith("Network error")) {
    return currentCode;
  }

  const lines = currentCode.split("\n");

  // Sort edits by startLine descending to avoid line number shifting issues
  const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);

  for (const edit of sortedEdits) {
    const { startLine, endLine, content } = edit;
    // Convert to 0-based index
    const start = startLine - 1;
    const end = endLine;
    // Replace the lines
    const newLines = content.split("\n");
    lines.splice(start, end - start, ...newLines);
  }

  const newCode = lines.join("\n");
  console.log(`[codespace-tools] editCode resulting code length: ${newCode.length}`);
  return updateCode(codespaceId, newCode);
}

/**
 * Search and replace in code
 */
async function searchAndReplace(
  codespaceId: string,
  search: string,
  replace: string,
  isRegex?: boolean,
): Promise<string> {
  console.log(`[codespace-tools] searchAndReplace called for: ${codespaceId}`);
  console.log(
    `[codespace-tools] searchAndReplace search: "${search.substring(0, 50)}${
      search.length > 50 ? "..." : ""
    }"`,
  );
  console.log(
    `[codespace-tools] searchAndReplace replace: "${replace.substring(0, 50)}${
      replace.length > 50 ? "..." : ""
    }"`,
  );
  console.log(`[codespace-tools] searchAndReplace isRegex: ${isRegex}`);

  const currentCode = await readCode(codespaceId);
  if (currentCode.startsWith("Error") || currentCode.startsWith("Network error")) {
    return currentCode;
  }

  let newCode: string;
  if (isRegex) {
    const regex = new RegExp(search, "g");
    newCode = currentCode.replace(regex, replace);
  } else {
    // Replace all occurrences of the literal string
    newCode = currentCode.split(search).join(replace);
  }

  if (newCode === currentCode) {
    console.log(`[codespace-tools] searchAndReplace: No matches found`);
    return "No matches found for the search pattern";
  }

  console.log(`[codespace-tools] searchAndReplace: Found matches, updating code`);
  return updateCode(codespaceId, newCode);
}

/**
 * Find lines matching a pattern
 */
async function findLines(
  codespaceId: string,
  search: string,
): Promise<string> {
  console.log(`[codespace-tools] findLines called for: ${codespaceId}`);
  console.log(`[codespace-tools] findLines search: "${search}"`);

  const currentCode = await readCode(codespaceId);
  if (currentCode.startsWith("Error") || currentCode.startsWith("Network error")) {
    return currentCode;
  }

  const lines = currentCode.split("\n");
  const matches: Array<{ line: number; content: string; }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.includes(search)) {
      matches.push({ line: i + 1, content: line });
    }
  }

  console.log(`[codespace-tools] findLines: Found ${matches.length} matches`);

  if (matches.length === 0) {
    return "No matches found";
  }

  return matches
    .map((m) => `Line ${m.line}: ${m.content}`)
    .join("\n");
}

/**
 * Create an MCP server with codespace tools for the given codespaceId
 */
export function createCodespaceServer(codespaceId: string) {
  console.log(`[codespace-tools] Creating MCP server for codespace: ${codespaceId}`);
  console.log(`[codespace-tools] Available tools: ${CODESPACE_TOOL_NAMES.join(", ")}`);

  return createSdkMcpServer({
    name: "codespace",
    version: "1.0.0",
    tools: [
      tool(
        "read_code",
        "Read the current code from the codespace. ALWAYS use this before making any changes to understand the current state.",
        {},
        async () => {
          const result = await readCode(codespaceId);
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "update_code",
        "Replace the ENTIRE code content of the file. Use this for major rewrites or when search_and_replace is too complex.",
        { code: z.string().describe("The full new code content for the file") },
        async (args) => {
          const result = await updateCode(codespaceId, args.code);
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
          const result = await editCode(codespaceId, args.edits);
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
          const result = await searchAndReplace(
            codespaceId,
            args.search,
            args.replace,
            args.isRegex,
          );
          return { content: [{ type: "text", text: result }] };
        },
      ),
      tool(
        "find_lines",
        "Find line numbers matching a pattern. Use this to locate code before using edit_code.",
        { search: z.string().describe("The string pattern to search for") },
        async (args) => {
          const result = await findLines(codespaceId, args.search);
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
