// MCP Shared - Protocol helpers
// JSON-RPC utilities and domain worker communication for the MCP protocol.

// JSON-RPC 2.0 response envelope
export function jsonRpcResponse(id, result) {
  return { jsonrpc: "2.0", id, result };
}

// JSON-RPC 2.0 error envelope
export function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// Call a domain worker via service binding using internal protocol
export async function callDomainWorker(service, method, payload) {
  const response = await service.fetch(new Request("http://internal/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, ...payload }),
  }));
  return response.json();
}

// Standard MCP tool result format
export function toolResult(content, isError = false) {
  return {
    content: [{
      type: "text",
      text: typeof content === "string" ? content : JSON.stringify(content, null, 2),
    }],
    isError,
  };
}
