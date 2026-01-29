import { Suspense } from "react";
import { auth } from "@/auth";

import { redirect } from "next/navigation";

/**
 * Reports list page
 * Displays all workspace reports for the user
 */
export default async function ReportsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workspace Reports</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage cross-workspace reports
        </p>
      </div>

      <Suspense fallback={<div>Loading reports...</div>}>
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Reports Coming Soon</h2>
          <p className="text-muted-foreground">
            Cross-workspace reporting is under development. You'll be able to
            create custom reports, schedule them, and export data in multiple
            formats.
          </p>
        </div>
      </Suspense>
    </div>
  );
}
