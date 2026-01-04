import { auth } from "@/auth";
import type { ReactNode } from "react";
import { OrbitSidebar } from "./OrbitSidebar";

export default async function OrbitDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  // Session check is handled in root layout, but we need session for user info
  // If no session here, something is wrong (or type safety), but we can't really redirect again effectively if root layout did its job.
  // However, for sidebar we need the data.

  return (
    <div className="min-h-screen bg-background">
      <OrbitSidebar
        userEmail={session?.user?.email}
        userName={session?.user?.name}
      />
      <main className="min-h-screen lg:pl-64">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
