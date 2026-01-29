/**
 * Boost Detector Cron Job
 *
 * Daily cron job to analyze all active workspaces and identify top performers
 *
 * GET /api/cron/boost-detector
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import { batchAnalyzeWorkspaces } from "@/lib/orbit/boost-detector/boost-detector-service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel Cron authentication)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active workspaces with social accounts
    const workspaces = await prisma.workspace.findMany({
      where: {
        deletedAt: null,
        socialAccounts: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    console.log(`Processing ${workspaces.length} workspaces for boost detection`);

    // Batch analyze all workspaces
    const results = await batchAnalyzeWorkspaces(workspaces.map((w: { id: string; slug: string; name: string; }) => w.id));

    // Compile statistics
    const stats = {
      totalWorkspaces: workspaces.length,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      totalTopPerformers: 0,
      workspaceResults: [] as Array<{
        workspaceId: string;
        slug: string;
        topPerformersCount: number;
      }>,
    };

    for (const workspace of workspaces) {
      const topPerformers = results.get(workspace.id) || [];

      if (topPerformers.length > 0 || results.has(workspace.id)) {
        stats.successfulAnalyses++;
      } else {
        stats.failedAnalyses++;
      }

      stats.totalTopPerformers += topPerformers.length;

      stats.workspaceResults.push({
        workspaceId: workspace.id,
        slug: workspace.slug,
        topPerformersCount: topPerformers.length,
      });
    }

    console.log("Boost detection cron completed:", stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error("Error in boost detector cron:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
