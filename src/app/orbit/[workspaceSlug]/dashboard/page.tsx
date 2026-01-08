/**
 * Orbit Dashboard Page
 *
 * Main dashboard showing Pulse AI Agent health monitoring
 * and social media performance overview.
 *
 * Resolves #649
 */

import { PulseDashboard } from "@/components/orbit/pulse";

interface DashboardPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your social media performance with Pulse AI Agent
          </p>
        </div>
      </div>

      <PulseDashboard workspaceSlug={workspaceSlug} />
    </div>
  );
}
