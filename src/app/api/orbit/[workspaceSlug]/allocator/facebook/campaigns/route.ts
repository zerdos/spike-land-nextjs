import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const resolvedParams = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { slug: resolvedParams.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    const campaigns = await prisma.allocatorCampaign.findMany({
      where: {
        workspaceId: workspace.id,
        platform: "FACEBOOK_ADS",
      },
      include: {
        adSets: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Failed to fetch Facebook campaigns:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
