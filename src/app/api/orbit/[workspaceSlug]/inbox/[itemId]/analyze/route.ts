import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { RoutingEngine } from "@/lib/smart-routing/routing-engine";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; itemId: string; }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams,
) {
  const { workspaceSlug, itemId } = await params;
  const session = await auth();

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:manage");

    // Trigger analysis
    await RoutingEngine.processItem(itemId, workspace.id);

    // Fetch updated item to return
    const updatedItem = await prisma.inboxItem.findUnique({
      where: { id: itemId },
      include: {
        suggestedResponses: true,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    console.error("Analysis API Error:", error);
    const message = error instanceof Error
      ? error.message
      : "Failed to analyze item";
    const status = (error as { status?: number; })?.status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
