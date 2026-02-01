/**
 * App Factory Dashboard Page
 *
 * Server component for the Jules App Factory monitoring dashboard.
 * Shows a Kanban board of apps in different development phases.
 */

import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import { redirect } from "next/navigation";
import { AppFactoryDashboardClient } from "./AppFactoryDashboardClient";

export const dynamic = "force-dynamic";

export default async function AppFactoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) {
    redirect("/");
  }

  return <AppFactoryDashboardClient />;
}
