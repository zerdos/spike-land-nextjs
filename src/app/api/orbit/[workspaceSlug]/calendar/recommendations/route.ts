/**
 * Calendar Best-Time Recommendations API
 *
 * Analyzes engagement history to suggest optimal posting times.
 * Returns platform-specific recommendations with fallback to industry benchmarks.
 *
 * Resolves #868
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getBestTimeRecommendations, type PlatformRecommendations } from "@/lib/calendar";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

/**
 * API response format as specified in #868
 */
interface RecommendationTime {
  dayOfWeek: number;
  hour: number;
  score: number;
}

interface PlatformRecommendation {
  platform: string;
  times: RecommendationTime[];
  dataSource: "historical" | "benchmark";
}

interface RecommendationsResponse {
  recommendations: PlatformRecommendation[];
}

/**
 * Transform service response to API response format
 */
function transformToApiResponse(
  platformRecommendations: PlatformRecommendations[],
): RecommendationsResponse {
  const recommendations: PlatformRecommendation[] = platformRecommendations.map(
    (pr) => {
      // Get top 5 time slots
      const times: RecommendationTime[] = pr.bestTimeSlots
        .slice(0, 5)
        .map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          hour: slot.hour,
          score: slot.engagementScore,
        }));

      return {
        platform: pr.platform,
        times,
        dataSource: pr.hasEnoughData ? "historical" : "benchmark",
      };
    },
  );

  return { recommendations };
}

/**
 * GET /api/orbit/[workspaceSlug]/calendar/recommendations
 *
 * Returns best-time posting recommendations per platform.
 *
 * Query parameters:
 * - accountIds: Comma-separated account IDs to filter (optional)
 * - lookbackDays: Number of days of historical data to analyze (default: 30)
 *
 * Response format:
 * {
 *   recommendations: {
 *     platform: string;
 *     times: { dayOfWeek: number; hour: number; score: number }[];
 *     dataSource: 'historical' | 'benchmark';
 *   }[]
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify membership
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const accountIdsParam = searchParams.get("accountIds");
  const lookbackDaysParam = searchParams.get("lookbackDays");

  const accountIds = accountIdsParam
    ? accountIdsParam.split(",").filter(Boolean)
    : undefined;
  const lookbackDays = lookbackDaysParam
    ? parseInt(lookbackDaysParam, 10)
    : 30;

  // Validate lookbackDays
  if (isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 365) {
    return NextResponse.json(
      { error: "lookbackDays must be between 1 and 365" },
      { status: 400 },
    );
  }

  // Get recommendations from service
  const { data: result, error: serviceError } = await tryCatch(
    getBestTimeRecommendations({
      workspaceId: workspace.id,
      accountIds,
      lookbackDays,
      includeGaps: false, // API focuses on time recommendations only
    }),
  );

  if (serviceError) {
    console.error("Failed to get best-time recommendations:", serviceError);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }

  // Transform and return response
  const response = transformToApiResponse(result.platformRecommendations);

  return NextResponse.json(response);
}
