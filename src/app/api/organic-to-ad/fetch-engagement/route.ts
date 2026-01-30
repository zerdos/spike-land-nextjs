/**
 * API Route: Fetch Engagement Data
 * Issue: #567 (ORB-063)
 */

import { EngagementFetcherFactory } from "@/lib/social/platform-api/engagement-fetcher-factory";
import type { SocialPlatform } from "@/lib/types/organic-to-ad";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { postId, platform, accessToken } = await request.json();

    if (!postId || !platform || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const fetcher = EngagementFetcherFactory.getFetcher(platform as SocialPlatform);

    const [engagement, insights] = await Promise.all([
      fetcher.fetchEngagement(postId, accessToken),
      fetcher.fetchAudienceInsights(postId, accessToken),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        engagement,
        insights,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch engagement data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
