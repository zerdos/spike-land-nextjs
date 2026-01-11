import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { RoutingEngine } from "@/lib/smart-routing/routing-engine";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { workspaceSlug: string; itemId: string; }; },
) {
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:manage");

    // Trigger analysis
    await RoutingEngine.processItem(params.itemId, workspace.id);

    // Fetch updated item to return
    const updatedItem = await prisma.inboxItem.findUnique({
      where: { id: params.itemId },
      include: {
        suggestedResponses: true,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    console.error("Analysis API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze item";
    const status = (error as { status?: number; })?.status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
