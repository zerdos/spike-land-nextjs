import { routes } from "@spike-npm-land/code";
import type Env from "./env";
import { handleFetchApi } from "./fetchHandler";
import { handleErrors } from "./handleErrors";
import { handleUnauthorizedRequest } from "./utils";

/**
 * Security headers to add to all responses.
 * These help prevent common web vulnerabilities.
 */
const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
};

/**
 * Adds security headers to a response.
 */
function addSecurityHeaders(response: Response): Response {
  // Skip WebSocket upgrade responses - they cannot be reconstructed
  // and don't need security headers
  if (response.status === 101) {
    return response;
  }

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    // Don't override if already set
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export async function handleMainFetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const { cf } = request as unknown as { cf?: { asOrganization?: string; }; };
  if (cf?.asOrganization?.startsWith("YANDEX")) {
    return handleUnauthorizedRequest();
  }

  return handleErrors(request, async () => {
    console.log(`handling request: ${request.url}`);

    const url = new URL(request.url);

    const redirect = routes[url.pathname as keyof typeof routes];
    if (redirect) {
      const response = await handleFetchApi(
        ["live", redirect, "embed"],
        request,
        env,
        ctx,
      );
      const finalResponse = response || new Response("Not Found", { status: 404 });
      return addSecurityHeaders(finalResponse);
    }

    const path = url.pathname.slice(1).split("/");
    const response = await handleFetchApi(path, request, env, ctx);
    const finalResponse = response || new Response("Not Found", { status: 404 });
    return addSecurityHeaders(finalResponse);
  });
}
