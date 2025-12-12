import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/mcp/balance
 *
 * Get the current token balance for the authenticated user
 *
 * Headers:
 *   Authorization: Bearer <api_key>
 *
 * Response:
 *   {
 *     balance: number,
 *     lastRegeneration: string (ISO date)
 *   }
 */
export async function GET(request: NextRequest) {
  // Authenticate via API key
  const authResult = await authenticateMcpRequest(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 },
    );
  }

  const { userId } = authResult;

  // Rate limiting
  const rateLimitResult = await checkRateLimit(
    `mcp:balance:${userId}`,
    rateLimitConfigs.mcpJobStatus, // Use job status limit (60/min) for balance checks
  );

  if (rateLimitResult.isLimited) {
    const retryAfter = Math.ceil(
      (rateLimitResult.resetAt - Date.now()) / 1000,
    );
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  try {
    const balanceInfo = await TokenBalanceManager.getBalance(userId!);

    return NextResponse.json({
      balance: balanceInfo.balance,
      lastRegeneration: balanceInfo.lastRegeneration.toISOString(),
    });
  } catch (error) {
    console.error("Failed to get balance:", error);
    return NextResponse.json(
      { error: "Failed to get token balance" },
      { status: 500 },
    );
  }
}
