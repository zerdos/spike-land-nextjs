/**
 * Admin Layout
 *
 * Protected admin dashboard layout with sidebar navigation.
 * Only users with ADMIN or SUPER_ADMIN role can access.
 */

import { auth } from "@/auth";

import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Always get session (auth() handles E2E bypass internally)
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) {
    redirect("/");
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
