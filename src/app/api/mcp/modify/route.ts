import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createModificationJob } from "@/lib/mcp/generation-service";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { EnhancementTier, MCP_GENERATION_COSTS } from "@/lib/tokens/costs";
import { NextRequest, NextResponse } from "next/server";

const VALID_TIERS: EnhancementTier[] = ["TIER_1K", "TIER_2K", "TIER_4K"];
const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Maximum image upload size in MB
 * Rationale:
 * - Gemini API accepts up to 20MB inline data
 * - 20MB allows high-res images (4K+) while preventing abuse
 * - Memory: 10 concurrent uploads × 20MB = 200MB worst case, acceptable
 */
const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Maximum prompt length in characters
 * Rationale:
 * - Gemini API accepts much longer prompts, but 4000 chars is ample for modification instructions
 * - Prevents abuse (very long prompts could cause processing delays)
 * - Keeps modification instructions focused and effective
 */
const MAX_PROMPT_LENGTH = 4000;

/**
 * POST /api/mcp/modify
 *
 * Modify an existing image with a text prompt
 *
 * Headers:
 *   Authorization: Bearer <api_key>
 *
 * Body (JSON):
 *   {
 *     prompt: string (required) - Modification instructions
 *     tier: "TIER_1K" | "TIER_2K" | "TIER_4K" (required) - Output resolution
 *     image: string (required) - Base64 encoded image data
 *     mimeType: string (required) - MIME type of the image
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
    `mcp:modify:${userId}`,
    rateLimitConfigs.mcpModify,
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
  let body: {
    prompt?: string;
    tier?: string;
    image?: string;
    mimeType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, tier, image, mimeType } = body;

  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 },
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
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

  // Validate image
  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "Image is required (base64 encoded)" },
      { status: 400 },
    );
  }

  // Validate mimeType
  if (!mimeType || !VALID_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      {
        error: `Invalid mimeType. Must be one of: ${VALID_MIME_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate image size
  const imageSizeBytes = Buffer.from(image, "base64").length;
  if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await createModificationJob({
      userId: userId!,
      apiKeyId,
      prompt: prompt.trim(),
      tier: tier as EnhancementTier,
      imageData: image,
      mimeType,
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
      message: "Modification started. Poll /api/mcp/jobs/{jobId} for status.",
    });
  } catch (error) {
    console.error("Failed to create modification job:", error);
    return NextResponse.json(
      { error: "Failed to start image modification" },
      { status: 500 },
    );
  }
}
