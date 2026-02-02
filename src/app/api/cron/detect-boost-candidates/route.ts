/**
 * Cron Job: Detect Boost Candidates
 * Runs periodically to identify high-performing organic posts
 * Issue #565 - Content-to-Ads Loop
 */

import { detectBoostOpportunities } from "@/lib/boost-detector/detector";
import { syncPostPerformance } from "@/lib/boost-detector/metrics-tracker";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify Cron Secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active workspaces
    // In a large system, we would queue these or process in batches
    const workspaces = await prisma.workspace.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const results = [];

    for (const workspace of workspaces) {
      try {
        // 1. Sync Post Performance
        await syncPostPerformance(workspace.id);

        // 2. Detect Opportunities
        const config = {
          engagementThreshold: 0.05,
          velocityThreshold: 5,
          minImpressions: 500,
          lookbackPeriod: 30,
        };

        const recommendations = await detectBoostOpportunities(
          workspace.id,
          config,
        );

        if (recommendations.length > 0) {
          results.push({
            workspace: workspace.slug,
            count: recommendations.length,
          });
        }
      } catch (error) {
        console.error(
          `Error processing workspace ${workspace.slug}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: workspaces.length,
      results,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
