import FacebookCampaigns from "@/components/orbit/allocator/facebook-campaigns";

export default async function FacebookCampaignsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; }>;
}) {
  const { workspaceSlug } = await params;
  return (
    <div style={{ padding: "2rem" }}>
      <FacebookCampaigns workspaceSlug={workspaceSlug} />
    </div>
  );
}
