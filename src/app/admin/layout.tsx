/**
 * Admin Layout
 *
 * Protected admin dashboard layout with sidebar navigation.
 * Only users with ADMIN or SUPER_ADMIN role can access.
 */

import { auth } from "@/auth";

import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check for E2E bypass header (only in non-production)
  const headersList = await headers();
  const e2eBypassHeader = headersList.get("x-e2e-auth-bypass");
  const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;
  const isE2EBypass = process.env.NODE_ENV !== "production" &&
    e2eBypassSecret &&
    e2eBypassHeader === e2eBypassSecret;

  // Always get session (auth() handles E2E bypass internally)
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // For E2E bypass, check role from session (set via e2e-user-role cookie)
  // For regular users, check role from database
  if (isE2EBypass) {
    // E2E session has role from cookie, check if admin
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      redirect("/");
    }
  } else {
    const userIsAdmin = await isAdminByUserId(session.user.id);
    if (!userIsAdmin) {
      redirect("/");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        userEmail={session.user.email}
        userName={session.user.name}
      />
      <main className="min-h-screen lg:pl-64">
        <div className="container mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
