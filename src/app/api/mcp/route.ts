/**
 * Streamable HTTP MCP Endpoint
 *
 * POST /api/mcp — Handle MCP JSON-RPC requests
 * GET  /api/mcp — SSE stream for server-initiated notifications (optional)
 * DELETE /api/mcp — Session termination
 *
 * Stateless mode (sessionIdGenerator: undefined) for Vercel serverless compatibility.
 * JSON response mode (enableJsonResponse: true) for simpler v1 implementation.
 *
 * Authentication: Bearer token (OAuth mcp_ token or API key)
 * If no token provided, returns 401 with WWW-Authenticate header for OAuth discovery.
 */

import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { getMcpBaseUrl as getBaseUrl } from "@/lib/mcp/get-base-url";
import { createMcpServer } from "@/lib/mcp/server/mcp-server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorizedResponse(): NextResponse {
  const baseUrl = getBaseUrl();
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: "Bearer token required. Use OAuth 2.1 or API key.",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp"`,
      },
    },
  );
}

export async function POST(request: NextRequest) {
  // Check for authentication
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  const authResult = await authenticateMcpRequest(request);
  if (!authResult.success || !authResult.userId) {
    return unauthorizedResponse();
  }

  // Parse the JSON-RPC request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400 },
    );
  }

  // Create MCP server for this user
  const mcpServer = createMcpServer(authResult.userId);

  // Create a stateless transport for this request
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless — no session tracking
    enableJsonResponse: true, // Return JSON instead of SSE
  });

  // Connect server to transport
  await mcpServer.connect(transport);

  try {
    // Create a ReadableStream from the request body for the transport
    const bodyStr = JSON.stringify(body);
    const bodyStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bodyStr));
        controller.close();
      },
    });

    // Create a mock IncomingMessage-like object for the transport
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Use the transport's handleRequest method
    // StreamableHTTPServerTransport expects node-style req/res
    // We need to adapt to the Web API
    const responsePromise = new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve) => {
      let responseBody = "";
      let statusCode = 200;
      const responseHeaders: Record<string, string> = {};

      const mockRes = {
        writeHead(status: number, resHeaders?: Record<string, string>) {
          statusCode = status;
          if (resHeaders) {
            Object.assign(responseHeaders, resHeaders);
          }
          return mockRes;
        },
        setHeader(name: string, value: string) {
          responseHeaders[name] = value;
        },
        write(chunk: string | Buffer) {
          responseBody += typeof chunk === "string" ? chunk : chunk.toString();
          return true;
        },
        end(chunk?: string | Buffer) {
          if (chunk) {
            responseBody += typeof chunk === "string" ? chunk : chunk.toString();
          }
          resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
        },
        on() { return mockRes; },
      };

      const mockReq = {
        method: "POST",
        headers,
        url: "/api/mcp",
        body: bodyStream,
        on(event: string, handler: (...args: unknown[]) => void) {
          if (event === "data") {
            handler(Buffer.from(bodyStr));
          }
          if (event === "end") {
            handler();
          }
          return mockReq;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport.handleRequest(mockReq as any, mockRes as any);
    });

    const result = await responsePromise;

    // Clean up
    await mcpServer.close();

    return new NextResponse(result.body, {
      status: result.status,
      headers: {
        "Content-Type": result.headers["content-type"] || "application/json",
        ...result.headers,
      },
    });
  } catch (error) {
    await mcpServer.close();
    console.error("MCP request error:", error);
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // For GET requests without auth, return the protected resource metadata hint
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return unauthorizedResponse();
  }

  // Authenticated GET — could be used for SSE notifications
  // For v1, just return method not allowed since we use JSON responses
  return NextResponse.json(
    { error: "SSE not supported in v1. Use POST for JSON-RPC requests." },
    { status: 405 },
  );
}

export async function DELETE() {
  // Session termination — stateless mode, nothing to clean up
  return NextResponse.json({ ok: true });
}
