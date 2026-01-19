/**
 * App Factory Dashboard Page
 *
 * Server component for the Jules App Factory monitoring dashboard.
 * Shows a Kanban board of apps in different development phases.
 */

import { auth } from "@/auth";
import { isAdmin, isAdminByUserId } from "@/lib/auth/admin-middleware";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppFactoryDashboardClient } from "./AppFactoryDashboardClient";

export const dynamic = "force-dynamic";

export default async function AppFactoryPage() {
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

  return <AppFactoryDashboardClient />;
}
