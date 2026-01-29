import { AnalyticsDashboard } from "@/components/orbit/analytics/AnalyticsDashboard";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights and performance metrics
          </p>
        </div>
      </div>

      <AnalyticsDashboard workspaceSlug={workspaceSlug} />
    </div>
  );
}
