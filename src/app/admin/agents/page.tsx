/**
 * Admin Agents Dashboard
 *
 * Server component for the agents dashboard.
 * Fetches initial data and renders the client component.
 */

import { auth } from "@/auth";
import { AgentsDashboardClient } from "@/components/admin/agents/AgentsDashboardClient";
import { isJulesAvailable } from "@/lib/agents/jules-client";
import { isAdmin, isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  // Check for E2E bypass header (only in non-production)
  const headersList = await headers();
  const e2eBypassHeader = headersList.get("x-e2e-auth-bypass");
  const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;
  const isE2EBypass = process.env.NODE_ENV !== "production" &&
    e2eBypassSecret &&
    e2eBypassHeader === e2eBypassSecret;

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // For E2E bypass, check role from session
  // For regular users, check role from database
  if (isE2EBypass) {
    if (!isAdmin(session)) {
      redirect("/");
    }
  } else {
    const userIsAdmin = await isAdminByUserId(session.user.id);
    if (!userIsAdmin) {
      redirect("/");
    }
  }

  // Fetch initial data
  const { data: sessionsData, error: sessionsError } = await tryCatch(
    Promise.all([
      prisma.externalAgentSession.findMany({
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          _count: {
            select: { activities: true },
          },
        },
      }),
      prisma.externalAgentSession.count(),
      prisma.externalAgentSession.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]),
  );

  const [sessions, total, statusGroups] = sessionsData || [[], 0, []];

  // Convert status groups to object
  const statusCounts = (statusGroups || []).reduce(
    (acc, group) => {
      acc[group.status] = group._count.status;
      return acc;
    },
    {} as Record<string, number>,
  );

  const initialData = {
    sessions: sessions.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      provider: s.provider,
      name: s.name,
      description: s.description,
      status: s.status,
      sourceRepo: s.sourceRepo,
      startingBranch: s.startingBranch,
      outputBranch: s.outputBranch,
      pullRequestUrl: s.pullRequestUrl,
      planSummary: s.planSummary,
      errorMessage: s.errorMessage,
      metadata: s.metadata as Record<string, unknown> | null,
      // Serialize Date fields to ISO strings
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      planApprovedAt: s.planApprovedAt?.toISOString() ?? null,
      lastActivityAt: s.lastActivityAt?.toISOString() ?? null,
      activityCount: s._count.activities,
    })),
    pagination: {
      total,
      limit: 20,
      offset: 0,
      hasMore: sessions.length < total,
    },
    statusCounts,
    julesAvailable: isJulesAvailable(),
    error: sessionsError?.message || null,
  };

  return <AgentsDashboardClient initialData={initialData} />;
}
