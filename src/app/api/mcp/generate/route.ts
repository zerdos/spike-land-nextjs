import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createGenerationJob } from "@/lib/mcp/generation-service";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { EnhancementTier, MCP_GENERATION_COSTS } from "@/lib/tokens/costs";
import { NextRequest, NextResponse } from "next/server";

const VALID_TIERS: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];

/**
 * POST /api/mcp/generate
 *
 * Generate a new image from a text prompt
 *
 * Headers:
 *   Authorization: Bearer <api_key>
 *
 * Body:
 *   {
 *     prompt: string (required) - Text description of the image to generate
 *     tier: "TIER_1K" | "TIER_2K" | "TIER_4K" (required) - Output resolution
 *     negativePrompt?: string - Things to avoid in the generation
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     jobId: string,
 *     tokensCost: number
 *   }
 */
export async function POST(request: NextRequest) {
  // Authenticate via API key
  const authResult = await authenticateMcpRequest(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { userId, apiKeyId } = authResult;

  // Rate limiting
  const rateLimitResult = await checkRateLimit(
    `mcp:generate:${userId}`,
    rateLimitConfigs.mcpGenerate,
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

  // Parse and validate request body
  let body: { prompt?: string; tier?: string; negativePrompt?: string; };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { prompt, tier, negativePrompt } = body;

  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 },
    );
  }

  if (prompt.length > 4000) {
    return NextResponse.json(
      { error: "Prompt must be 4000 characters or less" },
      { status: 400 },
    );
  }

  // Validate tier
  if (!tier || !VALID_TIERS.includes(tier as EnhancementTier)) {
    return NextResponse.json(
      {
        error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}`,
        pricing: Object.entries(MCP_GENERATION_COSTS).map(([t, cost]) => ({
          tier: t,
          cost,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const result = await createGenerationJob({
      userId: userId!,
      apiKeyId,
      prompt: prompt.trim(),
      tier: tier as EnhancementTier,
      negativePrompt: negativePrompt?.trim(),
    });

    if (!result.success) {
      // Determine appropriate status code
      const status = result.error?.includes("Insufficient") ? 402 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      tokensCost: result.tokensCost,
      message: "Generation started. Poll /api/mcp/jobs/{jobId} for status.",
    });
  } catch (error) {
    console.error("Failed to create generation job:", error);
    return NextResponse.json(
      { error: "Failed to start image generation" },
      { status: 500 },
    );
  }
}
