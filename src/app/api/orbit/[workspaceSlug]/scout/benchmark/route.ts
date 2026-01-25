import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateBenchmarkReport } from "@/lib/scout/competitor-analyzer";
import { getWorkspaceMetrics } from "@/lib/scout/workspace-metrics";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

export interface BenchmarkResponse {
  ownMetrics: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    totalPosts: number;
    engagementRate: number;
  };
  competitorMetrics: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    totalPosts: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * GET - Fetches benchmark data comparing workspace metrics with competitors
 *
 * Query Parameters:
 * - startDate: ISO date string (optional, defaults to 30 days ago)
 * - endDate: ISO date string (optional, defaults to today)
 */
export async function GET(
  request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    // Parse and validate date parameters
    const { searchParams } = new URL(request.url);
    const rawStartDate = searchParams.get("startDate");
    const rawEndDate = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (rawStartDate) {
      startDate = new Date(rawStartDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate parameter" }, {
          status: 400,
        });
      }
    } else {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    if (rawEndDate) {
      endDate = new Date(rawEndDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "Invalid endDate parameter" }, {
          status: 400,
        });
      }
    } else {
      endDate = new Date();
    }

    // Fetch own workspace metrics and competitor benchmark in parallel
    const [ownMetrics, benchmark] = await Promise.all([
      getWorkspaceMetrics(workspace.id, startDate, endDate),
      generateBenchmarkReport(workspace.id, startDate, endDate),
    ]);

    // Extract competitor metrics from benchmark or use defaults
    const competitorMetrics = benchmark
      ? (benchmark.competitorMetrics as {
        averageLikes: number;
        averageComments: number;
        averageShares: number;
        totalPosts: number;
      })
      : {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        totalPosts: 0,
      };

    const response: BenchmarkResponse = {
      ownMetrics,
      competitorMetrics,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch benchmark data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
