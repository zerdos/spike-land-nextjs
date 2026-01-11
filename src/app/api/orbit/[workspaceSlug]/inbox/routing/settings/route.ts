import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { getSmartRoutingSettings, updateSmartRoutingSettings } from "@/lib/smart-routing/settings";
import { SmartRoutingSettingsSchema } from "@/lib/validations/smart-routing";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  const session = await auth();
  // Fetch workspace first to ensure permissions and ID
  const workspace = await requireWorkspacePermission(
    session,
    params.workspaceSlug,
    "settings:manage",
  );

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const settings = await getSmartRoutingSettings(workspace.id);
  return NextResponse.json(settings);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  const session = await auth();
  const workspace = await requireWorkspacePermission(
    session,
    params.workspaceSlug,
    "settings:manage",
  );

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    const json = await req.json();
    const validated = SmartRoutingSettingsSchema.partial().parse(json);
    const updated = await updateSmartRoutingSettings(workspace.id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
