import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { getSmartRoutingSettings, updateSmartRoutingSettings } from "@/lib/smart-routing/settings";
import { SmartRoutingSettingsSchema } from "@/lib/validations/smart-routing";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  const session = await auth();

  // First, look up the workspace by slug
  const workspaceRecord = await prisma.workspace.findUnique({
    where: { slug: params.workspaceSlug },
    select: { id: true },
  });

  if (!workspaceRecord) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check permissions
  await requireWorkspacePermission(
    session,
    workspaceRecord.id,
    "workspace:settings:read",
  );

  const settings = await getSmartRoutingSettings(workspaceRecord.id);
  return NextResponse.json(settings);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  const session = await auth();

  // First, look up the workspace by slug
  const workspaceRecord = await prisma.workspace.findUnique({
    where: { slug: params.workspaceSlug },
    select: { id: true },
  });

  if (!workspaceRecord) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check permissions
  await requireWorkspacePermission(
    session,
    workspaceRecord.id,
    "workspace:settings:write",
  );

  try {
    const json = await req.json();
    const validated = SmartRoutingSettingsSchema.partial().parse(json);
    const updated = await updateSmartRoutingSettings(workspaceRecord.id, validated);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
