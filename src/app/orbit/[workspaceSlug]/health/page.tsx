/**
 * Account Health Monitoring Page
 * Resolves #522 (ORB-066): Account Health Monitor UI
 */

import { HealthDashboard } from "@/components/orbit/health/HealthDashboard";

interface HealthPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Account Health Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Monitor API limits, token expiry, and account status across all platforms
        </p>
      </div>

      <HealthDashboard workspaceSlug={workspaceSlug} />
    </div>
  );
}
