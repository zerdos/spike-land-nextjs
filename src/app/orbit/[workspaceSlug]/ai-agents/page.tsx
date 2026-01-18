import { AllocatorDashboard } from "@/components/orbit/allocator";

interface AiAgentsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function AiAgentsPage({ params }: AiAgentsPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
      </div>
      <AllocatorDashboard workspaceSlug={workspaceSlug} />
    </div>
  );
}
