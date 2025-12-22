/**
 * Admin Agents GitHub Issues API
 *
 * GET - Get open GitHub issues
 */

import { auth } from "@/auth";
import { getWorkflowRuns, isGitHubAvailable, listIssues } from "@/lib/agents/github-issues";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/agents/github/issues
 * Get open GitHub issues and CI status
 */
export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isGitHubAvailable()) {
    return NextResponse.json(
      { error: "GitHub API is not configured. Set GH_PAT_TOKEN environment variable." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const state = (searchParams.get("state") || "open") as "open" | "closed" | "all";
  const labels = searchParams.get("labels") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20");

  // Fetch issues and workflow runs in parallel
  const [issuesResult, workflowsResult] = await Promise.all([
    listIssues({ state, labels, limit }),
    getWorkflowRuns({ limit: 10 }),
  ]);

  if (issuesResult.error) {
    console.error("Failed to fetch issues:", issuesResult.error);
    return NextResponse.json(
      { error: issuesResult.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    issues: issuesResult.data,
    workflows: workflowsResult.data || [],
    workflowError: workflowsResult.error,
    githubConfigured: true,
    timestamp: new Date().toISOString(),
  });
}
