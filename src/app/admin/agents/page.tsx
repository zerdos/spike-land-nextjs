/**
 * Admin Agents Dashboard
 *
 * Server component for the agents dashboard.
 * Fetches initial data and renders the client component.
 */

import { auth } from "@/auth";
import { AgentsDashboardClient } from "@/components/admin/agents/AgentsDashboardClient";
import { isJulesAvailable } from "@/lib/agents/jules-client";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    redirect("/");
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
      ...s,
      activityCount: s._count.activities,
      _count: undefined,
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
