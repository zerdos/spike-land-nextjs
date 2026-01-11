import { auth } from "@/auth";
import { RoutingSettingsForm } from "@/components/orbit/settings/routing-settings-form";
import { Separator } from "@/components/ui/separator";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { getSmartRoutingSettings } from "@/lib/smart-routing/settings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Smart Routing Settings",
};

export default async function InboxRoutingSettingsPage({
  params,
}: {
  params: { workspaceSlug: string; };
}) {
  const session = await auth();
  const workspace = await requireWorkspacePermission(
    session,
    params.workspaceSlug,
    "settings:manage",
  );

  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  const settings = await getSmartRoutingSettings(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Inbox Smart Routing</h3>
        <p className="text-sm text-muted-foreground">
          Configure AI-powered analysis, priority scoring, and escalation rules.
        </p>
      </div>
      <Separator />
      <RoutingSettingsForm
        initialSettings={settings}
        workspaceSlug={params.workspaceSlug}
      />
    </div>
  );
}
