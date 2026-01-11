import { syncGoogleAdsCampaigns } from "@/lib/allocator/google-ads/campaign-sync";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ workspaceSlug: string; }>; },
) {
  const { workspaceSlug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await syncGoogleAdsCampaigns(workspace.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync Google Ads campaigns:", error);
    return NextResponse.json(
      { error: "Failed to sync campaigns" },
      { status: 500 },
    );
  }
}
