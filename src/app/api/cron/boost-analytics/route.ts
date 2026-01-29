/**
 * Boost Analytics Cron Job
 *
 * Daily cron job to analyze completed boosts and generate insights
 *
 * GET /api/cron/boost-analytics
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import { analyzeBoostImpact } from "@/lib/orbit/analytics/boost-impact-analyzer";
import {
  generateWorkspaceInsights,
  storeInsights,
} from "@/lib/orbit/analytics/insight-generator";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel Cron authentication)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting boost analytics cron job");

    // Get all completed boosts without analysis
    const boostsToAnalyze = await prisma.boostedPost.findMany({
      where: {
        status: "COMPLETED",
        impactAnalysis: null,
      },
      include: {
        originalPost: {
          include: {
            performance: true,
          },
        },
        performance: true,
      },
      take: 100, // Process 100 at a time
    });

    console.log(`Found ${boostsToAnalyze.length} boosts to analyze`);

    let analyzedCount = 0;
    let failedCount = 0;

    // Analyze each boost
    for (const boost of boostsToAnalyze) {
      try {
        if (!boost.originalPost.performance || !boost.performance) {
          console.log(`Skipping boost ${boost.id}: missing performance data`);
          continue;
        }

        await analyzeBoostImpact({
          boostedPostId: boost.id,
          organicBaseline: {
            impressions: boost.originalPost.performance.impressions,
            engagementRate: Number(boost.originalPost.performance.engagementRate),
            reach: boost.originalPost.performance.reach,
            clicks: boost.originalPost.performance.clicks,
          },
          boostPeriodStart: boost.startedAt || boost.createdAt,
          boostPeriodEnd: boost.endedAt || new Date(),
        });

        analyzedCount++;
      } catch (error) {
        console.error(`Error analyzing boost ${boost.id}:`, error);
        failedCount++;
      }
    }

    console.log(`Analyzed ${analyzedCount} boosts, ${failedCount} failed`);

    // Get all workspaces with boosts
    const workspaces = await prisma.workspace.findMany({
      where: {
        boostedPosts: {
          some: {},
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    console.log(`Generating insights for ${workspaces.length} workspaces`);

    let insightsGenerated = 0;
    let insightsFailed = 0;

    // Generate insights for each workspace
    for (const workspace of workspaces) {
      try {
        const insights = await generateWorkspaceInsights(workspace.id);
        await storeInsights(workspace.id, insights);
        insightsGenerated += insights.length;
      } catch (error) {
        console.error(
          `Error generating insights for workspace ${workspace.id}:`,
          error,
        );
        insightsFailed++;
      }
    }

    console.log(`Generated ${insightsGenerated} insights`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        boostsAnalyzed: analyzedCount,
        boostsFailed: failedCount,
        workspacesProcessed: workspaces.length,
        insightsGenerated,
        insightsFailed,
      },
    });
  } catch (error) {
    console.error("Error in boost analytics cron:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
