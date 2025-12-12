/**
 * Admin Layout
 *
 * Protected admin dashboard layout with sidebar navigation.
 * Only users with ADMIN or SUPER_ADMIN role can access.
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userIsAdmin = await isAdminByUserId(session.user.id);

  if (!userIsAdmin) {
    redirect("/");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/analytics", label: "User Analytics", icon: "📈" },
    { href: "/admin/tokens", label: "Token Economics", icon: "💰" },
    { href: "/admin/system", label: "System Health", icon: "🏥" },
    { href: "/admin/jobs", label: "Jobs", icon: "⚙️" },
    { href: "/admin/vouchers", label: "Vouchers", icon: "🎟️" },
    { href: "/admin/users", label: "User Management", icon: "👥" },
    { href: "/admin/photos", label: "Photos", icon: "📸" },
    { href: "/admin/gallery", label: "Featured Gallery", icon: "🖼️" },
    { href: "/admin/feedback", label: "Feedback", icon: "💬" },
    { href: "/admin/emails", label: "Email Logs", icon: "📧" },
    { href: "/admin/sitemap", label: "Sitemap Preview", icon: "🗺️" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-neutral-200 p-6 dark:border-neutral-800">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {session.user.name || session.user.email}
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span>←</span>
                <span>Back to App</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
