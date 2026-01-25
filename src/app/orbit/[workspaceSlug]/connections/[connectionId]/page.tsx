interface PageProps {
  params: Promise<{ workspaceSlug: string; connectionId: string; }>;
}

export default async function ConnectionDetailPage({ params }: PageProps) {
  const { connectionId } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Connection Details</h1>
      <p className="text-muted-foreground">ID: {connectionId}</p>
    </div>
  );
}
