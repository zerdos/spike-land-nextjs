import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const warmth = searchParams.get("warmth");
    const status = searchParams.get("status");

    const where: Prisma.ConnectionWhereInput = {
      workspaceId: workspace.id,
    };

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (warmth === "hot") where.warmthScore = { gte: 80 };
    if (warmth === "warm") where.warmthScore = { gte: 50, lt: 80 };
    if (warmth === "cold") where.warmthScore = { lt: 50 };

    if (status && status !== "all") where.meetupStatus = status as any; // Type assertion safe here based on enum

    const connections = await prisma.connection.findMany({
      where,
      include: {
        platformPresence: true,
      },
      orderBy: {
        warmthScore: "desc",
      },
    });

    return NextResponse.json(connections);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const { displayName, avatarUrl, notes } = body;

    const connection = await prisma.connection.create({
      data: {
        workspaceId: workspace.id,
        displayName,
        avatarUrl,
        notes,
      },
    });

    return NextResponse.json(connection);
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
