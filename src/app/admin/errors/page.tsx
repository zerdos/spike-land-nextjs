/**
 * Admin Error Logs Page
 *
 * View and search application errors with filtering and real-time updates.
 */

import prisma from "@/lib/prisma";
import { ErrorsAdminClient } from "./ErrorsAdminClient";

async function getInitialData() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [errors, total, stats] = await Promise.all([
    prisma.errorLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
    prisma.errorLog.count(),
    prisma.errorLog.count({
      where: { timestamp: { gte: twentyFourHoursAgo } },
    }),
  ]);

  return {
    errors,
    pagination: {
      page: 1,
      limit: 50,
      total,
      totalPages: Math.ceil(total / 50),
    },
    stats: {
      total24h: stats,
    },
  };
}

export default async function AdminErrorsPage() {
  const initialData = await getInitialData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Error Logs</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Real-time error tracking from tryCatch blocks across the application
        </p>
      </div>

      <ErrorsAdminClient initialData={initialData} />
    </div>
  );
}
