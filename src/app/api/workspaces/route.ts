import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

// GET /api/workspaces - List user's workspaces
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships, error } = await tryCatch(
    prisma.workspaceMember.findMany({
      where: {
        userId: session.user.id,
        joinedAt: { not: null }, // Only include accepted memberships
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            avatarUrl: true,
            isPersonal: true,
          },
        },
      },
      orderBy: [
        { workspace: { isPersonal: "desc" } }, // Personal workspace first
        { workspace: { name: "asc" } },
      ],
    }),
  );

  if (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    workspaces: memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    })),
  });
}
