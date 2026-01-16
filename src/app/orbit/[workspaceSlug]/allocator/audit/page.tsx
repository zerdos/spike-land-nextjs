import { AllocatorAuditLogViewer } from "@/components/orbit/allocator/AllocatorAuditLogViewer";

export default async function AllocatorAuditPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; }>;
}) {
  const { workspaceSlug } = await params;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Allocator Audit Trail
          </h2>
          <p className="text-muted-foreground">
            Monitor and audit all automated budget allocation decisions.
          </p>
        </div>
      </div>
      <AllocatorAuditLogViewer workspaceSlug={workspaceSlug} />
    </div>
  );
}
