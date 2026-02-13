import { auth } from "@/auth";
import { verifyAccessToken } from "@/lib/mcp/oauth/token-service";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";

interface McpAuthResult {
  success: boolean;
  userId?: string;
  oauthClientId?: string;
  error?: string;
}

/**
 * Authenticates an MCP API request using Bearer token (OAuth only)
 *
 * @param request - The incoming Next.js request
 * @returns Authentication result with userId if successful
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await authenticateMcpRequest(request);
 *   if (!authResult.success) {
 *     return NextResponse.json({ error: authResult.error }, { status: 401 });
 *   }
 *
 *   const { userId } = authResult;
 *   // Continue with authenticated request...
 * }
 * ```
 */
export async function authenticateMcpRequest(
  request: NextRequest,
): Promise<McpAuthResult> {
  // Extract Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      success: false,
      error: "Missing Authorization header",
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Invalid Authorization header format. Expected: Bearer <token>",
    };
  }

  // Extract the token
  const token = authHeader.slice(7).trim();

  if (!token) {
    return {
      success: false,
      error: "Missing token",
    };
  }

  // Only accept MCP OAuth tokens (prefixed with "mcp_")
  if (!token.startsWith("mcp_")) {
    return {
      success: false,
      error: "Invalid token format. Only OAuth tokens are accepted.",
    };
  }

  const { data: payload, error: oauthError } = await tryCatch(
    verifyAccessToken(token),
  );

  if (oauthError) {
    return {
      success: false,
      error: "OAuth token verification failed",
    };
  }

  if (!payload) {
    return {
      success: false,
      error: "Invalid or expired OAuth token",
    };
  }

  return {
    success: true,
    userId: payload.userId,
    oauthClientId: payload.clientId,
  };
}

/**
 * Authenticates using either OAuth Bearer token or session auth
 * Useful for endpoints that need to work from both the browser UI and external API clients
 *
 * @param request - The incoming Next.js request
 * @returns Authentication result with userId if successful
 */
export async function authenticateMcpOrSession(
  request: NextRequest,
): Promise<McpAuthResult> {
  // First try Bearer token auth
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authenticateMcpRequest(request);
  }

  // Fall back to session auth
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    return {
      success: false,
      error: "Session authentication failed",
    };
  }

  if (session?.user?.id) {
    return {
      success: true,
      userId: session.user.id,
    };
  }

  return {
    success: false,
    error: "Authentication required. Provide an OAuth token or sign in.",
  };
}
