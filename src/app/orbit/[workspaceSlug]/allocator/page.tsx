/**
 * Allocator Dashboard Page
 *
 * Main dashboard for AI-powered budget allocation recommendations.
 * Shows spend overview, performance charts, and actionable recommendations.
 *
 * Resolves #552
 */

import { AllocatorDashboard } from "@/components/orbit/allocator";

interface AllocatorPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function AllocatorPage({ params }: AllocatorPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Allocator</h1>
          <p className="text-muted-foreground">
            AI-powered budget allocation recommendations for your ad campaigns
          </p>
        </div>
      </div>

      <AllocatorDashboard workspaceSlug={workspaceSlug} />
    </div>
  );
}
