import { auth } from "@/auth";
import { RoutingSettingsForm } from "@/components/orbit/settings/routing-settings-form";
import { Separator } from "@/components/ui/separator";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getSmartRoutingSettings } from "@/lib/smart-routing/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Smart Routing Settings",
};

export default async function InboxRoutingSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; }>;
}) {
  const { workspaceSlug } = await params;
  const session = await auth();

  // First, look up the workspace by slug
  const workspaceRecord = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspaceRecord) {
    return <div>Workspace not found</div>;
  }

  // Check permissions
  await requireWorkspacePermission(
    session,
    workspaceRecord.id,
    "workspace:settings:read",
  );

  const settings = await getSmartRoutingSettings(workspaceRecord.id);

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
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
