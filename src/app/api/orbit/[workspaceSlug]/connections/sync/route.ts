import { syncInboxConnections } from "@/lib/connections/inbox-sync";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Trigger sync
    // This relies on the inbox-sync lib
    const results = await syncInboxConnections(workspace.id);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
