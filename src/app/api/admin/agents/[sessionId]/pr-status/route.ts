/**
 * PR Status API
 *
 * GET /api/admin/agents/[sessionId]/pr-status
 *
 * Returns comprehensive PR status including:
 * - PR details (title, branches, state)
 * - Branch comparison (ahead/behind main)
 * - CI check status
 * - Vercel preview URL
 */

import { auth } from "@/auth";
import {
  compareBranches,
  extractPrNumberFromUrl,
  getCheckRuns,
  getCommitStatus,
  getPullRequest,
  isGitHubAvailable,
} from "@/lib/agents/github-issues";
import type { PRCheckResult, PRStatus, PRStatusResponse } from "@/lib/agents/pr-status-types";
import { getPreviewDeployment, isVercelAvailable } from "@/lib/agents/vercel-deployments";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; }>; },
): Promise<NextResponse<PRStatusResponse>> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json(
      { success: false, data: null, error: "Forbidden" },
      { status: 403 },
    );
  }

  const { sessionId } = await context.params;

  // Get the agent session from database
  const { data: agentSession, error: dbError } = await tryCatch(
    prisma.externalAgentSession.findUnique({
      where: { id: sessionId },
    }),
  );

  if (dbError) {
    return NextResponse.json(
      { success: false, data: null, error: "Database error" },
      { status: 500 },
    );
  }

  if (!agentSession) {
    return NextResponse.json(
      { success: false, data: null, error: "Session not found" },
      { status: 404 },
    );
  }

  if (!agentSession.pullRequestUrl) {
    return NextResponse.json(
      { success: false, data: null, error: "No PR associated with this session" },
      { status: 404 },
    );
  }

  if (!isGitHubAvailable()) {
    return NextResponse.json(
      { success: false, data: null, error: "GitHub API not configured" },
      { status: 503 },
    );
  }

  // Extract PR number from URL
  const prNumber = extractPrNumberFromUrl(agentSession.pullRequestUrl);

  if (!prNumber) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid PR URL format" },
      { status: 400 },
    );
  }

  // Fetch PR details
  const { data: pr, error: prError } = await getPullRequest(prNumber);

  if (prError || !pr) {
    return NextResponse.json(
      { success: false, data: null, error: prError || "Failed to fetch PR" },
      { status: 502 },
    );
  }

  // Fetch branch comparison (is PR behind main?)
  const { data: comparison } = await compareBranches(pr.baseBranch, pr.headBranch);

  // Fetch CI status
  const { data: commitStatus } = await getCommitStatus(pr.headSha);
  const { data: checkRuns } = await getCheckRuns(pr.headSha);

  // Calculate CI summary
  const checks: PRCheckResult[] = (checkRuns || []).map((run) => ({
    name: run.name,
    status: run.status as PRCheckResult["status"],
    conclusion: run.conclusion as PRCheckResult["conclusion"],
    url: run.url,
  }));

  const checksTotal = checks.length;
  const checksPassed = checks.filter((c) => c.conclusion === "success").length;
  const checksFailed = checks.filter(
    (c) => c.conclusion === "failure" || c.conclusion === "timed_out",
  ).length;
  const checksPending = checks.filter(
    (c) => c.status !== "completed" || c.conclusion === null,
  ).length;

  // Determine overall CI status
  let ciStatus: PRStatus["ciStatus"] = "unknown";
  let ciStatusMessage = "Unknown";

  if (commitStatus) {
    ciStatus = commitStatus.state;
    if (commitStatus.state === "success") {
      ciStatusMessage = "All checks passed";
    } else if (commitStatus.state === "failure") {
      ciStatusMessage = `${checksFailed} check${checksFailed !== 1 ? "s" : ""} failed`;
    } else if (commitStatus.state === "pending") {
      ciStatusMessage = `${checksPending} check${checksPending !== 1 ? "s" : ""} pending`;
    } else {
      ciStatusMessage = "Error in checks";
    }
  } else if (checksTotal > 0) {
    // Derive from check runs if no combined status
    if (checksFailed > 0) {
      ciStatus = "failure";
      ciStatusMessage = `${checksFailed} check${checksFailed !== 1 ? "s" : ""} failed`;
    } else if (checksPending > 0) {
      ciStatus = "pending";
      ciStatusMessage = `${checksPending} check${checksPending !== 1 ? "s" : ""} pending`;
    } else if (checksPassed === checksTotal) {
      ciStatus = "success";
      ciStatusMessage = "All checks passed";
    }
  }

  // Fetch Vercel preview URL
  let previewUrl: string | null = null;
  let previewState: string | null = null;

  if (isVercelAvailable()) {
    const { data: deployment } = await getPreviewDeployment(pr.headBranch);
    if (deployment) {
      previewUrl = deployment.url;
      previewState = deployment.readyState;
    }
  }

  const prStatus: PRStatus = {
    prNumber: pr.number,
    prUrl: pr.url,
    prTitle: pr.title,
    targetBranch: pr.baseBranch,
    headBranch: pr.headBranch,
    headSha: pr.headSha,
    draft: pr.draft,
    mergeableState: pr.mergeableState,

    behindBy: comparison?.behindBy ?? 0,
    aheadBy: comparison?.aheadBy ?? 0,
    isUpToDate: (comparison?.behindBy ?? 0) === 0,

    ciStatus,
    ciStatusMessage,
    checks,
    checksTotal,
    checksPassed,
    checksFailed,
    checksPending,

    previewUrl,
    previewState,

    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: prStatus,
    error: null,
  });
}
