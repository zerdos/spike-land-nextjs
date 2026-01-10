/**
 * Account Health Detail API
 *
 * GET /api/orbit/[workspaceSlug]/accounts/health/[accountId] - Get detailed health for one account
 *
 * Resolves #586: Implement Account Health Monitor
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getAccountHealthEvents,
  getOrCreateHealth,
  getRecoveryGuidance,
  getUnresolvedIssues,
  scoreToStatus,
} from "@/lib/health-monitor";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; accountId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/accounts/health/[accountId] - Get detailed health
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, accountId } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug and verify user is a member
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

  // Get account and verify it belongs to this workspace
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId: workspace.id,
      },
    }),
  );

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get or create health record
  const health = await getOrCreateHealth(accountId);

  // Get recent events
  const events = await getAccountHealthEvents(accountId, 20);

  // Get unresolved issues
  const unresolvedIssues = await getUnresolvedIssues(accountId);

  // Get recovery guidance for any critical issues
  const guidancePromises = unresolvedIssues.map(async (issue) => {
    // Map event type to issue type
    const issueTypeMap: Record<string, string> = {
      ERROR_OCCURRED: "API_ERROR",
      TOKEN_EXPIRED: "TOKEN_EXPIRED",
      RATE_LIMIT_HIT: "RATE_LIMITED",
    };
    const issueType = issueTypeMap[issue.eventType];
    if (issueType) {
      const guidance = await getRecoveryGuidance(
        issueType as "API_ERROR" | "TOKEN_EXPIRED" | "RATE_LIMITED",
        account.platform,
      );
      return { issueId: issue.id, guidance };
    }
    return null;
  });

  const guidanceResults = await Promise.all(guidancePromises);
  const recoveryGuidance = guidanceResults.filter(Boolean);

  // Build detailed response
  const response = {
    account: {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      accountId: account.accountId,
      status: account.status,
      connectedAt: account.connectedAt,
    },
    health: {
      healthScore: health.healthScore,
      status: scoreToStatus(health.healthScore),
      lastSuccessfulSync: health.lastSuccessfulSync,
      lastSyncAttempt: health.lastSyncAttempt,
      lastError: health.lastError,
      lastErrorAt: health.lastErrorAt,
      consecutiveErrors: health.consecutiveErrors,
      totalErrorsLast24h: health.totalErrorsLast24h,
      rateLimitRemaining: health.rateLimitRemaining,
      rateLimitTotal: health.rateLimitTotal,
      rateLimitResetAt: health.rateLimitResetAt,
      isRateLimited: health.isRateLimited,
      tokenExpiresAt: health.tokenExpiresAt,
      tokenRefreshRequired: health.tokenRefreshRequired,
      updatedAt: health.updatedAt,
    },
    events,
    unresolvedIssues,
    recoveryGuidance,
  };

  return NextResponse.json(response);
}
