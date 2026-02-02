"use client";

import { CrossWorkspaceReport } from "@/components/orbit/CrossWorkspaceReport";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cross-Workspace Reports</h1>
        <p className="text-muted-foreground">
          Analyze performance across multiple workspaces and generate aggregate reports.
        </p>
      </div>
      <CrossWorkspaceReport />
    </div>
  );
}
