import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { ApiKeyValidationResult, validateApiKey } from "./api-key-manager";

export interface McpAuthResult {
  success: boolean;
  userId?: string;
  apiKeyId?: string;
  error?: string;
}

/**
 * Authenticates an MCP API request using Bearer token
 *
 * @param request - The incoming Next.js request
 * @returns Authentication result with userId and apiKeyId if successful
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await authenticateMcpRequest(request);
 *   if (!authResult.success) {
 *     return NextResponse.json({ error: authResult.error }, { status: 401 });
 *   }
 *
 *   const { userId, apiKeyId } = authResult;
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
      error: "Invalid Authorization header format. Expected: Bearer <api_key>",
    };
  }

  // Extract the API key
  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    return {
      success: false,
      error: "Missing API key",
    };
  }

  // Validate the API key
  const validationResult: ApiKeyValidationResult = await validateApiKey(apiKey);

  if (!validationResult.isValid) {
    return {
      success: false,
      error: validationResult.error || "Invalid API key",
    };
  }

  return {
    success: true,
    userId: validationResult.userId,
    apiKeyId: validationResult.apiKeyId,
  };
}

/**
 * Extracts the API key from a request without validating it
 * Useful for logging or debugging
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
}

/**
 * Creates a masked version of an API key for logging
 * Security: Only reveal 7 characters to match api-key-manager.ts
 * @example sk_live_abc123... -> sk_live...****
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 7) {
    return "***";
  }
  return apiKey.slice(0, 7) + "...****";
}

/**
 * Authenticates using either API key (Bearer token) or session auth
 * Useful for endpoints that need to work from both the browser UI and external API clients
 *
 * @param request - The incoming Next.js request
 * @returns Authentication result with userId if successful
 */
export async function authenticateMcpOrSession(
  request: NextRequest,
): Promise<McpAuthResult> {
  // First try API key auth
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authenticateMcpRequest(request);
  }

  // Fall back to session auth
  const session = await auth();

  if (session?.user?.id) {
    return {
      success: true,
      userId: session.user.id,
    };
  }

  return {
    success: false,
    error: "Authentication required. Provide an API key or sign in.",
  };
}
