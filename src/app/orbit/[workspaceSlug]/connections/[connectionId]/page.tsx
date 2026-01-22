export default function ConnectionDetailPage(
  { params }: { params: { workspaceSlug: string; connectionId: string; }; },
) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Connection Details</h1>
      <p className="text-muted-foreground">ID: {params.connectionId}</p>
    </div>
  );
}
