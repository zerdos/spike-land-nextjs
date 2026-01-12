import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceSlug: string; id: string; }; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve params
  const { workspaceSlug, id } = await params;

  // Resolve workspace by slug & check access
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
  }

  try {
    const log = await prisma.allocatorAuditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    // Ensure log belongs to workspace
    if (log.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error fetching allocator audit log detail:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
