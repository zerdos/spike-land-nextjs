/**
 * Shared Tool Helpers
 *
 * Error wrapper, workspace resolution, and API request helpers
 * used across all MCP tool modules.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpError, McpErrorCode, MCP_ERROR_MESSAGES, MCP_ERROR_RETRYABLE } from "../../errors";

const SPIKE_LAND_BASE_URL =
  process.env["NEXT_PUBLIC_APP_URL"] || "https://spike.land";

/**
 * Classify an error into an McpErrorCode with a suggestion for the agent.
 */
interface ClassifiedToolError {
  code: McpErrorCode;
  message: string;
  suggestion: string;
  retryable: boolean;
}

function classifyError(error: unknown, toolName: string): ClassifiedToolError {
  if (error instanceof McpError) {
    return {
      code: error.code,
      message: error.message,
      suggestion: MCP_ERROR_MESSAGES[error.code],
      retryable: error.retryable,
    };
  }

  const msg = error instanceof Error ? error.message : "Unknown error";
  const msgLower = msg.toLowerCase();

  // Match common patterns
  if (msgLower.includes("not found") || msgLower.includes("404")) {
    const isApp = toolName.startsWith("apps_");
    const code = isApp ? McpErrorCode.APP_NOT_FOUND : McpErrorCode.WORKSPACE_NOT_FOUND;
    return {
      code,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[code],
      retryable: false,
    };
  }

  if (msgLower.includes("unauthorized") || msgLower.includes("forbidden") || msgLower.includes("403")) {
    return {
      code: McpErrorCode.PERMISSION_DENIED,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[McpErrorCode.PERMISSION_DENIED],
      retryable: false,
    };
  }

  if (msgLower.includes("conflict") || msgLower.includes("409") || msgLower.includes("already exists") || msgLower.includes("already taken")) {
    return {
      code: McpErrorCode.CONFLICT,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[McpErrorCode.CONFLICT],
      retryable: false,
    };
  }

  if (msgLower.includes("validation") || msgLower.includes("invalid") || msgLower.includes("400")) {
    return {
      code: McpErrorCode.VALIDATION_ERROR,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[McpErrorCode.VALIDATION_ERROR],
      retryable: false,
    };
  }

  if (msgLower.includes("rate limit") || msgLower.includes("429") || msgLower.includes("too many")) {
    return {
      code: McpErrorCode.RATE_LIMITED,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[McpErrorCode.RATE_LIMITED],
      retryable: true,
    };
  }

  if (msgLower.includes("insufficient") || msgLower.includes("credits") || msgLower.includes("balance")) {
    return {
      code: McpErrorCode.INSUFFICIENT_CREDITS,
      message: msg,
      suggestion: MCP_ERROR_MESSAGES[McpErrorCode.INSUFFICIENT_CREDITS],
      retryable: false,
    };
  }

  return {
    code: McpErrorCode.UNKNOWN,
    message: msg,
    suggestion: "Try again, or use a different approach.",
    retryable: MCP_ERROR_RETRYABLE[McpErrorCode.UNKNOWN],
  };
}

/**
 * Format a classified error into an MCP CallToolResult with structured suggestion.
 */
function formatErrorResult(classified: ClassifiedToolError): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text:
          `**Error: ${classified.code}**\n` +
          `${classified.message}\n` +
          `**Suggestion:** ${classified.suggestion}\n` +
          `**Retryable:** ${classified.retryable}`,
      },
    ],
    isError: true,
  };
}

/**
 * Wrap a tool handler with error classification and structured error responses.
 * Every tool should use this wrapper.
 */
export async function safeToolCall(
  toolName: string,
  handler: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await handler();
  } catch (error) {
    const classified = classifyError(error, toolName);
    return formatErrorResult(classified);
  }
}

/**
 * Resolve and validate workspace membership for a user.
 * Returns the workspace or throws an McpError.
 */
export async function resolveWorkspace(
  userId: string,
  slug: string,
): Promise<{ id: string; slug: string; name: string }> {
  const prisma = (await import("@/lib/prisma")).default;

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      members: { some: { userId } },
    },
    select: { id: true, slug: true, name: true },
  });

  if (!workspace) {
    throw new McpError(
      `Workspace '${slug}' not found or you are not a member.`,
      McpErrorCode.WORKSPACE_NOT_FOUND,
      false,
    );
  }

  return workspace;
}

/**
 * Make an authenticated request to the spike.land API.
 * Used by tools that call internal API routes.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const serviceToken =
    process.env["SPIKE_LAND_SERVICE_TOKEN"] ||
    process.env["SPIKE_LAND_API_KEY"] ||
    "";

  const url = `${SPIKE_LAND_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serviceToken) {
    headers["Authorization"] = `Bearer ${serviceToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers as Record<string, string> },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "Unknown error");
    let errorMsg: string;
    try {
      const json = JSON.parse(body) as { error?: string };
      errorMsg = json.error || body;
    } catch {
      errorMsg = body;
    }

    if (response.status === 404) {
      throw new McpError(errorMsg, McpErrorCode.APP_NOT_FOUND, false);
    }
    if (response.status === 403 || response.status === 401) {
      throw new McpError(errorMsg, McpErrorCode.PERMISSION_DENIED, false);
    }
    if (response.status === 409) {
      throw new McpError(errorMsg, McpErrorCode.CONFLICT, false);
    }
    if (response.status === 429) {
      throw new McpError(errorMsg, McpErrorCode.RATE_LIMITED, true);
    }
    if (response.status === 400) {
      throw new McpError(errorMsg, McpErrorCode.VALIDATION_ERROR, false);
    }
    throw new McpError(errorMsg, McpErrorCode.UPSTREAM_SERVICE_ERROR, true);
  }

  return response.json() as Promise<T>;
}

/**
 * Simple text result helper for consistent formatting.
 */
export function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}
