import db from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { workspaceSlug: string; }; },
) {
  try {
    const { workspaceSlug } = params;

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return new NextResponse("Workspace not found", { status: 404 });
    }

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
    console.error("Error fetching workspace members:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
