import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { analyzeMessage } from "@/lib/smart-routing/analyze-message";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { workspaceSlug: string; itemId: string; }; },
) {
  const session = await auth();

  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    await requireWorkspacePermission(session, workspace.id, "inbox:view");

    const suggestions = await db.inboxSuggestedResponse.findMany({
      where: { inboxItemId: params.itemId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suggestions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { workspaceSlug: string; itemId: string; }; },
) {
  const session = await auth();

  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    await requireWorkspacePermission(session, workspace.id, "inbox:manage");

    // Regenerate suggestions
    const item = await db.inboxItem.findUnique({ where: { id: params.itemId } });
    if (!item?.content) throw new Error("Item content missing");

    const analysis = await analyzeMessage({
      content: item.content,
      senderName: item.senderName,
      platform: item.platform,
    });

    if (analysis.suggestedResponses?.length) {
      await db.inboxSuggestedResponse.createMany({
        data: analysis.suggestedResponses.map((content) => ({
          inboxItemId: params.itemId,
          content,
          confidenceScore: 0.8,
          tone: "professional",
          category: "regenerated",
        })),
      });
    }

    const suggestions = await db.inboxSuggestedResponse.findMany({
      where: { inboxItemId: params.itemId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suggestions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
