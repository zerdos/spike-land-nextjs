import { auth } from "@/auth";
import { tryCatch } from "@/lib/try-catch";
import {
  getAggregateDailyMetrics,
  getAggregateKPIs,
  getUserWorkspaceIds,
  getWorkspaceSummaries,
} from "@/lib/workspace/aggregate-queries";
import { NextResponse } from "next/server";
import { z } from "zod";

const reportSchema = z.object({
  workspaceIds: z.array(z.string()).min(1),
  dateRange: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
  }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = reportSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const { workspaceIds, dateRange } = validation.data;

  // Verify access to requested workspaces
  const { data: accessibleWorkspaceIds, error: accessError } = await tryCatch(
    getUserWorkspaceIds(session.user.id),
  );

  if (accessError || !accessibleWorkspaceIds) {
    return NextResponse.json(
      { error: "Failed to verify workspace access" },
      { status: 500 },
    );
  }

  const allowedWorkspaceIds = workspaceIds.filter((id) => accessibleWorkspaceIds.includes(id));

  if (allowedWorkspaceIds.length === 0) {
    return NextResponse.json(
      { error: "No accessible workspaces requested" },
      { status: 403 },
    );
  }

  // Fetch data
  const [kpisResult, dailyMetricsResult, summariesResult] = await Promise.all([
    tryCatch(getAggregateKPIs(allowedWorkspaceIds, dateRange)),
    tryCatch(getAggregateDailyMetrics(allowedWorkspaceIds, dateRange)),
    tryCatch(getWorkspaceSummaries(allowedWorkspaceIds, dateRange)),
  ]);

  if (kpisResult.error || dailyMetricsResult.error || summariesResult.error) {
    console.error("Report generation error:", {
      kpis: kpisResult.error,
      daily: dailyMetricsResult.error,
      summaries: summariesResult.error,
    });
    return NextResponse.json(
      { error: "Failed to generate report data" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    kpis: kpisResult.data,
    dailyMetrics: dailyMetricsResult.data,
    summaries: summariesResult.data,
  });
}
