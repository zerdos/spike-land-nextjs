import { McpAuthError, McpRateLimitError, McpRpcError } from "./errors";
import { tokenManager } from "./token-manager";
import type { CallToolResult, JsonRpcResponse } from "./types";

export interface CallToolOptions {
  signal?: AbortSignal;
}

/**
 * Call an MCP tool via the JSON-RPC proxy
 */
export async function callTool<T = unknown>(
  name: string,
  args: unknown = {},
  options: CallToolOptions = {},
): Promise<T> {
  const token = await tokenManager.getToken();
  if (!token) throw new McpAuthError();

  const response = await fetch("/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
      id: Math.random().toString(36).substring(7),
    }),
    signal: options.signal,
  });

  if (response.status === 401) {
    tokenManager.clear();
    // Retry once
    const newToken = await tokenManager.getToken();
    if (!newToken) throw new McpAuthError();
    
    // Re-call with new token
    return callTool(name, args, options);
  }

  if (response.status === 429) {
    throw new McpRateLimitError();
  }

  if (!response.ok) {
    throw new Error(`MCP request failed with status ${response.status}`);
  }

  const rpcResponse: JsonRpcResponse<CallToolResult> = await response.json();

  if (rpcResponse.error) {
    throw new McpRpcError(
      rpcResponse.error.code,
      rpcResponse.error.message,
      rpcResponse.error.data,
    );
  }

  if (rpcResponse.result?.isError) {
    const message = rpcResponse.result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    throw new Error(message || `Tool ${name} reported an error`);
  }

  // MCP results are wrapped in a content array. By convention, we return the parsed JSON
  // if the first content item is text that looks like JSON, or the raw content if not.
  const textContent = rpcResponse.result?.content.find((c) => c.type === "text")?.text;
  
  if (textContent) {
    try {
      return JSON.parse(textContent);
    } catch {
      return textContent as T;
    }
  }

  return rpcResponse.result as T;
}

/**
 * SSE streaming tool call
 */
export function callToolStream(
  name: string,
  args: unknown = {},
): EventSource {
  // We'll need a way to pass the token to EventSource. 
  // Custom headers are not supported, so we'll use a query param.
  // The server implementation of /api/mcp should be updated to handle SSE and query param tokens.
  const queryToken = Date.now(); // Placeholder, we'll get real token in hook
  return new EventSource(`/api/mcp?method=tools/call&name=${name}&arguments=${encodeURIComponent(JSON.stringify(args))}&token=${queryToken}`);
}
