import { auth } from "@/auth";
import type { WorkspaceAction } from "@/lib/permissions/permissions";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import db from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const session = await auth();
    const { workspaceSlug } = params;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return new NextResponse("Workspace not found", { status: 404 });
    }

    // Verify user has permission to view workspace members
    await requireWorkspacePermission(
      session,
      workspace.id,
      "workspace:view" as WorkspaceAction,
    );

    const members = await db.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    const formattedMembers = members.map((member) => ({
      id: member.user.id,
      name: member.user.name || member.user.email || "Unknown",
      avatarUrl: member.user.image,
      role: member.role,
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unauthorized")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (message.includes("Forbidden")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    console.error("Error fetching workspace members:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
