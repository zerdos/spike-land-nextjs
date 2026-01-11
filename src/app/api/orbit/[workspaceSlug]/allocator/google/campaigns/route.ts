import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
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

  const campaigns = await prisma.allocatorCampaign.findMany({
    where: {
      workspaceId: workspace.id,
      platform: "GOOGLE_ADS",
    },
    include: {
      adSets: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ campaigns });
}
