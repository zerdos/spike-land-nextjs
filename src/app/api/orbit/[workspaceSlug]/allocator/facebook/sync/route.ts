import { syncFacebookCampaigns } from "@/lib/allocator/facebook-ads/campaign-sync";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const resolvedParams = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { slug: resolvedParams.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Trigger the sync process asynchronously
    syncFacebookCampaigns(workspace.id).catch((error) => {
      console.error(
        `[Facebook Sync] Failed for workspace ${workspace.id}:`,
        error,
      );
    });

    return NextResponse.json({ message: "Sync process started" });
  } catch (error) {
    console.error("Failed to start Facebook campaigns sync:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
