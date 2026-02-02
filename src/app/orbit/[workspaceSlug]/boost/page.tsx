import { BoostDashboardClient } from "./BoostDashboardClient";

export default async function BoostPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; }>;
}) {
  const { workspaceSlug } = await params;
  return <BoostDashboardClient workspaceSlug={workspaceSlug} />;
}
