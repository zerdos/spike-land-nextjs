import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Bolt Orchestrator | Admin",
  description: "Manage Bolt agent orchestration, sync status, and active tasks",
};

export default async function BoltDashboardPage() {
  // Fetch data from API route
  let dashboardData = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/bolt`, { cache: "no-store" });
    if (res.ok) {
      dashboardData = await res.json();
    }
  } catch {
    // Render with defaults if API unavailable
  }

  const activeTasks = dashboardData?.activeTasks ?? [];
  const syncStatus = dashboardData?.syncStatus ?? { status: "unknown", lastSync: null };
  const config = dashboardData?.config ?? { wipLimit: 3, autoMerge: false, autoApprove: true };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bolt Orchestrator</h1>
        <p className="text-muted-foreground">
          Manage agent orchestration, BridgeMind sync, and Jules sessions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Tasks</CardDescription>
            <CardTitle className="text-4xl">{activeTasks.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              WIP Limit: {config.wipLimit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sync Status</CardDescription>
            <CardTitle className="text-2xl capitalize">{syncStatus.status}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Last sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Configuration</CardDescription>
            <CardTitle className="text-lg">
              {config.autoMerge ? "Auto-merge ON" : "Manual merge"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Auto-approve: {config.autoApprove ? "Yes" : "No"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>Current tasks being processed by Bolt</CardDescription>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active tasks. Use <code>/bolt plan</code> in Claude Code to start.
            </p>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task: { taskId: string; status: string; bridgemindId?: string; julesSessionId?: string; prNumber?: number; lastUpdated: string }) => (
                <div key={task.taskId} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{task.taskId}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.bridgemindId && `BM: ${task.bridgemindId}`}
                      {task.julesSessionId && ` | Jules: ${task.julesSessionId}`}
                      {task.prNumber && ` | PR #${task.prNumber}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
