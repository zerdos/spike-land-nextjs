/**
 * Audience Analysis API Route
 *
 * POST /api/audience/analyze - Trigger AI analysis of campaign audience
 * GET /api/audience/analyze?briefId=xxx - Retrieve cached analysis results
 */

import { auth } from "@/auth";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  analyzeAudience,
  BriefNotFoundError,
  IncompleteAudienceDataError,
} from "@/services/audience-analysis";
import { AnalyzeAudienceRequestSchema } from "@spike-npm-land/shared/validations";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/audience/analyze
 *
 * Triggers AI-powered analysis of a campaign's target audience.
 * Requires authentication and brief ownership.
 *
 * Request body:
 * {
 *   "briefId": "clx123..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "analysis": {
 *     "score": 85,
 *     "insights": { ... },
 *     "suggestions": [ ... ]
 *   },
 *   "cached": false
 * }
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    logger.error("[AUDIENCE_ANALYZE_API] Auth error:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const validationResult = AnalyzeAudienceRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validationResult.error.errors,
      },
      { status: 400 },
    );
  }

  const { briefId } = validationResult.data;

  // Verify brief exists and user owns it
  const { data: brief, error: briefError } = await tryCatch(
    prisma.campaignBrief.findUnique({
      where: { id: briefId },
      select: { userId: true },
    }),
  );

  if (briefError) {
    logger.error("[AUDIENCE_ANALYZE_API] Database error:", briefError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!brief) {
    return NextResponse.json(
      { error: "Campaign brief not found" },
      { status: 404 },
    );
  }

  if (brief.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden - you don't own this campaign brief" },
      { status: 403 },
    );
  }

  // Perform analysis
  const { data: analysis, error: analysisError } = await tryCatch(
    analyzeAudience(briefId),
  );

  if (analysisError) {
    // Handle specific error types
    if (analysisError instanceof IncompleteAudienceDataError) {
      return NextResponse.json(
        {
          error: "Incomplete audience data",
          missingFields: analysisError.missingFields,
        },
        { status: 422 },
      );
    }

    if (analysisError instanceof BriefNotFoundError) {
      return NextResponse.json(
        { error: "Campaign brief not found" },
        { status: 404 },
      );
    }

    // Check for timeout or rate limit errors
    if (
      analysisError instanceof Error &&
      analysisError.message.includes("timed out")
    ) {
      return NextResponse.json(
        { error: "Analysis request timed out. Please try again." },
        { status: 503 },
      );
    }

    if (
      analysisError instanceof Error &&
      analysisError.message.includes("rate limit")
    ) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    // Generic error
    logger.error("[AUDIENCE_ANALYZE_API] Analysis error:", analysisError);
    return NextResponse.json(
      { error: "Failed to analyze audience" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    analysis: {
      score: analysis.score,
      insights: analysis.insights,
      suggestions: analysis.suggestions,
    },
    cached: analysis.rawAnalysis === "cached",
  });
}

/**
 * GET /api/audience/analyze?briefId=xxx
 *
 * Retrieves cached analysis results for a campaign brief.
 * Requires authentication and brief ownership.
 *
 * Query params:
 * - briefId: string (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "analysis": {
 *     "score": 85,
 *     "insights": { ... },
 *     "suggestions": [ ... ]
 *   },
 *   "cached": true
 * }
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    logger.error("[AUDIENCE_ANALYZE_API] Auth error:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get and validate query params
  const { searchParams } = new URL(request.url);
  const briefId = searchParams.get("briefId");

  if (!briefId) {
    return NextResponse.json(
      { error: "Missing required query parameter: briefId" },
      { status: 400 },
    );
  }

  // Verify brief exists and user owns it
  const { data: brief, error: briefError } = await tryCatch(
    prisma.campaignBrief.findUnique({
      where: { id: briefId },
      include: { audienceAnalysis: true },
    }),
  );

  if (briefError) {
    logger.error("[AUDIENCE_ANALYZE_API] Database error:", briefError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!brief) {
    return NextResponse.json(
      { error: "Campaign brief not found" },
      { status: 404 },
    );
  }

  if (brief.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden - you don't own this campaign brief" },
      { status: 403 },
    );
  }

  // Check if analysis exists
  if (!brief.audienceAnalysis) {
    return NextResponse.json(
      {
        error: "No analysis found for this campaign brief",
        hint: "Use POST /api/audience/analyze to trigger analysis",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    analysis: {
      score: brief.audienceAnalysis.score || 0,
      insights: brief.audienceAnalysis.insights,
      suggestions: brief.audienceAnalysis.suggestions,
    },
    cached: true,
  });
}
