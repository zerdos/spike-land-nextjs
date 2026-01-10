import FacebookCampaigns from "@/components/orbit/allocator/facebook-campaigns";

export default async function FacebookCampaignsPage({
  params,
}: {
  params: { workspaceSlug: string; };
}) {
  const resolvedParams = await params;
  return (
    <div style={{ padding: "2rem" }}>
      <FacebookCampaigns workspaceSlug={resolvedParams.workspaceSlug} />
    </div>
  );
}
