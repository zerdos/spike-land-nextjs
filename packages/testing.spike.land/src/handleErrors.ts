function getWebSocketPair(): [WebSocket, WebSocket] {
  const dummyPair = new WebSocketPair();
  return [dummyPair[0], dummyPair[1]];
}

// Generic error message for client responses - never expose internal details
const GENERIC_ERROR_MESSAGE = "An internal error occurred. Please try again later.";

export function handleErrors(
  request: Request,
  cb: () => Promise<Response>,
): Promise<Response> {
  return cb().catch((err: unknown) => {
    // Always log full error details server-side for debugging
    // This information stays on the server and is never sent to clients
    if (err instanceof Error) {
      console.error("[handleErrors] Uncaught exception:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
    } else {
      console.error("[handleErrors] Uncaught non-Error exception:", err);
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = getWebSocketPair();
      pair[1].accept();
      // SECURITY: Only send generic error message, never stack traces
      // Stack traces can reveal internal implementation details (OWASP A01:2021)
      pair[1].send(JSON.stringify({ error: GENERIC_ERROR_MESSAGE }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, {
        status: 101,
        webSocket: pair[0],
      } as { status: number; webSocket: WebSocket; });
    } else {
      // SECURITY: Only return generic error message, never stack traces
      // Stack traces can reveal file paths, library versions, and code structure
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR_MESSAGE }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  });
}
