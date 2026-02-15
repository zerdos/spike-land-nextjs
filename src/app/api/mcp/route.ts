/**
 * Streamable HTTP MCP Endpoint
 *
 * POST /api/mcp — Handle MCP JSON-RPC requests (JSON or SSE based on Accept header)
 * GET  /api/mcp — Returns 405 (stateless mode, no server-initiated notifications)
 * DELETE /api/mcp — Session termination
 *
 * Stateless mode (sessionIdGenerator: undefined) for Vercel serverless compatibility.
 * Response format determined by client Accept header:
 *   - Accept: text/event-stream → SSE streaming response
 *   - Otherwise → JSON response (default, backward compatible)
 *
 * Authentication: Bearer token (OAuth mcp_ token or API key)
 * If no token provided, returns 401 with WWW-Authenticate header for OAuth discovery.
 */

import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { getMcpBaseUrl } from "@/lib/mcp/get-base-url";
import { createMcpServer } from "@/lib/mcp/server/mcp-server";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorizedResponse(): NextResponse {
  const baseUrl = getMcpBaseUrl();
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: "Bearer token required. Use an API key or OAuth 2.1.",
      help: {
        api_key: `${baseUrl}/settings?tab=api-keys`,
        oauth_discovery: `${baseUrl}/.well-known/oauth-authorization-server`,
        documentation: `${baseUrl}/mcp`,
      },
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

  // Rate limit by userId
  const { isLimited, resetAt } = await checkRateLimit(
    `mcp-rpc:${authResult.userId}`,
    rateLimitConfigs.mcpJsonRpc,
  );
  if (isLimited) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Rate limit exceeded" }, id: null },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      },
    );
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

  // Determine response format from client Accept header
  const acceptsSSE = request.headers.get("Accept")?.includes("text/event-stream") ?? false;

  // Create a stateless transport for this request
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless — no session tracking
    enableJsonResponse: !acceptsSSE, // SSE when client requests it, JSON otherwise
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

    // StreamableHTTPServerTransport expects node-style req/res.
    // We adapt Web API ↔ Node.js depending on response format.
    if (acceptsSSE) {
      // SSE mode: stream chunks via a TransformStream
      const { readable, writable } = new TransformStream<Uint8Array>();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      let statusCode = 200;
      const responseHeaders: Record<string, string> = {};

      const mockRes = {
        writeHead(status: number, resHeaders?: Record<string, string>) {
          statusCode = status;
          if (resHeaders) Object.assign(responseHeaders, resHeaders);
          return mockRes;
        },
        setHeader(name: string, value: string | string[]) {
          responseHeaders[name] = Array.isArray(value) ? value.join(", ") : value;
        },
        write(chunk: string | Uint8Array) {
          const text = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
          writer.write(encoder.encode(text));
          return true;
        },
        end(chunk?: string | Uint8Array) {
          if (chunk) {
            const text = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
            writer.write(encoder.encode(text));
          }
          writer.close();
        },
        on() { return mockRes; },
        flushHeaders() { /* no-op for Web API */ },
      };

      const mockReq = {
        method: "POST",
        headers,
        url: "/api/mcp",
        body: bodyStream,
        on(event: string, handler: (...args: unknown[]) => void) {
          if (event === "data") queueMicrotask(() => handler(Buffer.from(bodyStr)));
          if (event === "end") queueMicrotask(() => handler());
          return mockReq;
        },
      };

      // Transport writes to the stream asynchronously; catch errors to close the stream gracefully
      transport.handleRequest(
        mockReq as unknown as import("http").IncomingMessage,
        mockRes as unknown as import("http").ServerResponse,
      ).catch((err: unknown) => {
        console.error("SSE transport error:", err);
        writer.close().catch(() => { /* already closed */ });
      });

      return new NextResponse(readable, {
        status: statusCode,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...responseHeaders,
        },
      });
    } else {
      // JSON mode: buffer the full response
      const responsePromise = new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve) => {
        let responseBody = "";
        let statusCode = 200;
        const responseHeaders: Record<string, string> = {};

        const mockRes = {
          writeHead(status: number, resHeaders?: Record<string, string>) {
            statusCode = status;
            if (resHeaders) Object.assign(responseHeaders, resHeaders);
            return mockRes;
          },
          setHeader(name: string, value: string | string[]) {
            responseHeaders[name] = Array.isArray(value) ? value.join(", ") : value;
          },
          write(chunk: string | Uint8Array) {
            responseBody += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
            return true;
          },
          end(chunk?: string | Uint8Array) {
            if (chunk) {
              responseBody += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
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
            if (event === "data") queueMicrotask(() => handler(Buffer.from(bodyStr)));
            if (event === "end") queueMicrotask(() => handler());
            return mockReq;
          },
        };

        transport.handleRequest(mockReq as unknown as import("http").IncomingMessage, mockRes as unknown as import("http").ServerResponse);
      });

      const result = await responsePromise;

      const { "content-type": contentType, ...restHeaders } = result.headers;
      return new NextResponse(result.body, {
        status: result.status,
        headers: {
          "Content-Type": contentType || "application/json",
          ...restHeaders,
        },
      });
    }
  } catch (error) {
    console.error("MCP request error:", error);
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null },
      { status: 500 },
    );
  } finally {
    await mcpServer.close();
  }
}

export async function GET(request: NextRequest) {
  // For GET requests without auth, return the protected resource metadata hint
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return unauthorizedResponse();
  }

  // In stateless mode, GET for SSE server-initiated notifications is not supported.
  // Clients should use POST with Accept: text/event-stream for streaming responses.
  return NextResponse.json(
    {
      error: "SSE server-initiated notifications require session mode.",
      hint: "Send POST requests with Accept: text/event-stream for streaming responses.",
    },
    { status: 405 },
  );
}

export async function DELETE() {
  // Session termination — stateless mode, nothing to clean up
  return NextResponse.json({ ok: true });
}
