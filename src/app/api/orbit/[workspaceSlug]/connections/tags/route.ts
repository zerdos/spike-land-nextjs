import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const tags = await prisma.connectionTag.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    const tag = await prisma.connectionTag.create({
      data: {
        workspaceId: workspace.id,
        name,
        color,
      },
    });

    return NextResponse.json(tag);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
