// MCP Gateway - Progressive disclosure gateway for spike.land MCP tools
// Speaks MCP JSON-RPC externally and routes to domain workers via service bindings.
// Clients start with 6 always-on tools and enable domains on demand.

import { DOMAIN_REGISTRY, DOMAIN_LIST } from "mcp-shared/domains";
import { jsonRpcResponse, jsonRpcError, callDomainWorker, toolResult } from "mcp-shared/protocol";

// ---------------------------------------------------------------------------
// Session state: sessionId -> Set of enabled domain names
// ---------------------------------------------------------------------------
const sessions = new Map();

// Tool-to-domain index: toolName -> domainName (built lazily)
const toolDomainIndex = new Map();

// Cached tool lists per domain: domainName -> tool[]
const domainToolCache = new Map();

// ---------------------------------------------------------------------------
// Always-on gateway tools (available without enabling any domain)
// ---------------------------------------------------------------------------
const GATEWAY_TOOLS = [
  {
    name: "list_domains",
    description: "List all available tool domains with descriptions and tool counts. Use this first to discover capabilities.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_tools",
    description: "Search for tools by name or description across all domains.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "explore_domain",
    description: "List all tools in a specific domain without enabling them.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain name from list_domains" },
      },
      required: ["domain"],
    },
  },
  {
    name: "enable_domain",
    description: "Enable a domain to make its tools available for use.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain name to enable" },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_balance",
    description: "Check remaining AI credits and usage limits.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_status",
    description: "Get platform status: enabled domains, tool counts, and session info.",
    inputSchema: { type: "object", properties: {} },
  },
];

const GATEWAY_TOOL_NAMES = new Set(GATEWAY_TOOLS.map(t => t.name));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MCP-Session-Id, Accept",
    "Access-Control-Expose-Headers": "X-MCP-Session-Id",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Set());
  }
  return sessions.get(sessionId);
}

// Fetch and cache the tool list from a domain worker
async function getDomainTools(domainName, env) {
  if (domainToolCache.has(domainName)) {
    return domainToolCache.get(domainName);
  }

  const domain = DOMAIN_REGISTRY[domainName];
  if (!domain) return [];

  const service = env[domain.binding];
  if (!service) return [];

  try {
    const result = await callDomainWorker(service, "list_tools", {});
    const tools = result.tools || [];
    domainToolCache.set(domainName, tools);

    // Index each tool to its domain
    for (const tool of tools) {
      toolDomainIndex.set(tool.name, domainName);
    }

    return tools;
  } catch (err) {
    console.error(`[mcp-gateway] Failed to fetch tools from ${domainName}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Gateway tool handlers
// ---------------------------------------------------------------------------

async function handleListDomains(sessionId) {
  const enabled = getSession(sessionId);
  const domains = DOMAIN_LIST.map(d => ({
    name: d.name,
    displayName: d.displayName,
    description: d.description,
    toolCount: d.toolCount,
    enabled: enabled.has(d.name),
  }));

  return toolResult({
    totalDomains: domains.length,
    totalTools: domains.reduce((sum, d) => sum + d.toolCount, 0),
    domains,
  });
}

async function handleSearchTools(params, env) {
  const query = (params.query || "").toLowerCase();
  const limit = params.limit || 10;
  const results = [];

  for (const domain of DOMAIN_LIST) {
    const tools = await getDomainTools(domain.name, env);
    for (const tool of tools) {
      if (
        tool.name.toLowerCase().includes(query) ||
        (tool.description || "").toLowerCase().includes(query)
      ) {
        results.push({
          name: tool.name,
          description: tool.description,
          domain: domain.name,
          domainDisplayName: domain.displayName,
        });
        if (results.length >= limit) break;
      }
    }
    if (results.length >= limit) break;
  }

  return toolResult({
    query: params.query,
    resultCount: results.length,
    results,
  });
}

async function handleExploreDomain(params, env) {
  const domainName = params.domain;
  const domain = DOMAIN_REGISTRY[domainName];
  if (!domain) {
    return toolResult(`Unknown domain: ${domainName}. Use list_domains to see available domains.`, true);
  }

  const tools = await getDomainTools(domainName, env);
  return toolResult({
    domain: domain.name,
    displayName: domain.displayName,
    description: domain.description,
    toolCount: tools.length,
    tools: tools.map(t => ({ name: t.name, description: t.description })),
  });
}

async function handleEnableDomain(params, sessionId, env) {
  const domainName = params.domain;
  const domain = DOMAIN_REGISTRY[domainName];
  if (!domain) {
    return toolResult(`Unknown domain: ${domainName}. Use list_domains to see available domains.`, true);
  }

  const enabled = getSession(sessionId);
  if (enabled.has(domainName)) {
    return toolResult(`Domain "${domain.displayName}" is already enabled.`);
  }

  // Fetch tools from domain to populate index
  const tools = await getDomainTools(domainName, env);
  enabled.add(domainName);

  return toolResult({
    message: `Enabled domain "${domain.displayName}" with ${tools.length} tools.`,
    domain: domainName,
    toolCount: tools.length,
    tools: tools.map(t => t.name),
  });
}

async function handleGetBalance(env) {
  // Placeholder - will proxy to workspace domain when available
  return toolResult({
    credits: "unlimited (preview)",
    plan: "developer",
    note: "Balance tracking will be available when the billing domain is deployed.",
  });
}

async function handleGetStatus(sessionId) {
  const enabled = getSession(sessionId);
  const enabledDomains = [...enabled].map(name => {
    const d = DOMAIN_REGISTRY[name];
    return { name, displayName: d?.displayName, toolCount: d?.toolCount };
  });

  const enabledToolCount = enabledDomains.reduce((sum, d) => sum + (d.toolCount || 0), 0);

  return toolResult({
    sessionId,
    enabledDomains,
    enabledDomainCount: enabledDomains.length,
    activeToolCount: GATEWAY_TOOLS.length + enabledToolCount,
    gatewayToolCount: GATEWAY_TOOLS.length,
    totalAvailableDomains: DOMAIN_LIST.length,
  });
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC method dispatcher
// ---------------------------------------------------------------------------

async function handleMethod(method, params, sessionId, env) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: { listChanged: true },
        },
        serverInfo: {
          name: "spike-land",
          version: "1.0.0",
        },
      };

    case "notifications/initialized":
      // Client acknowledgement, no response needed
      return {};

    case "tools/list": {
      // Always include gateway tools
      const tools = [...GATEWAY_TOOLS];

      // Add tools from enabled domains
      const enabled = getSession(sessionId);
      for (const domainName of enabled) {
        const domainTools = await getDomainTools(domainName, env);
        tools.push(...domainTools);
      }

      return { tools };
    }

    case "tools/call": {
      const toolName = params?.name;
      if (!toolName) {
        throw new Error("Missing tool name in tools/call");
      }

      const toolArgs = params?.arguments || {};

      // Gateway tools - handle locally
      if (GATEWAY_TOOL_NAMES.has(toolName)) {
        switch (toolName) {
          case "list_domains":
            return await handleListDomains(sessionId);
          case "search_tools":
            return await handleSearchTools(toolArgs, env);
          case "explore_domain":
            return await handleExploreDomain(toolArgs, env);
          case "enable_domain":
            return await handleEnableDomain(toolArgs, sessionId, env);
          case "get_balance":
            return await handleGetBalance(env);
          case "get_status":
            return await handleGetStatus(sessionId);
        }
      }

      // Domain tools - route to the owning domain worker
      const domainName = toolDomainIndex.get(toolName);
      if (!domainName) {
        return toolResult(`Unknown tool: ${toolName}. Use list_domains and enable_domain to discover tools.`, true);
      }

      const enabled = getSession(sessionId);
      if (!enabled.has(domainName)) {
        return toolResult(
          `Tool "${toolName}" belongs to the "${DOMAIN_REGISTRY[domainName]?.displayName}" domain which is not enabled. Use enable_domain to activate it first.`,
          true,
        );
      }

      const domain = DOMAIN_REGISTRY[domainName];
      const service = env[domain.binding];
      if (!service) {
        return toolResult(`Domain service "${domainName}" is not available.`, true);
      }

      const callResult = await callDomainWorker(service, "call_tool", {
        toolName,
        args: toolArgs,
        userId: params?.userId || "",
      });
      return callResult.result || callResult;
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// SSE stream helpers for MCP Streamable HTTP transport
// ---------------------------------------------------------------------------

function sseMessage(event, data) {
  let msg = "";
  if (event) msg += `event: ${event}\n`;
  msg += `data: ${JSON.stringify(data)}\n\n`;
  return msg;
}

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return jsonResponse({
        status: "ok",
        service: "mcp-gateway",
        domains: DOMAIN_LIST.length,
        activeSessions: sessions.size,
      });
    }

    // MCP uses POST for JSON-RPC
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(jsonRpcError(null, -32700, "Parse error"), 400);
    }

    const { id, method, params } = body;

    // Extract session ID from headers or generate one
    let sessionId = request.headers.get("x-mcp-session-id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    // Check if client wants SSE (Accept: text/event-stream)
    const acceptSSE = (request.headers.get("Accept") || "").includes("text/event-stream");

    try {
      const result = await handleMethod(method, params, sessionId, env);

      if (acceptSSE) {
        // Streamable HTTP transport: respond with SSE
        const encoder = new TextEncoder();
        const body = encoder.encode(
          sseMessage("message", jsonRpcResponse(id, result)),
        );

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-MCP-Session-Id": sessionId,
            ...corsHeaders(),
          },
        });
      }

      // Standard JSON-RPC response
      const response = jsonResponse(jsonRpcResponse(id, result));
      response.headers.set("X-MCP-Session-Id", sessionId);
      return response;
    } catch (err) {
      console.error(`[mcp-gateway] Error handling ${method}:`, err);
      return jsonResponse(jsonRpcError(id, -32603, err.message));
    }
  },
};
