import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  content: z.string().trim().min(1, "Reply content cannot be empty"),
});

export async function POST(
  request: Request,
  { params }: { params: { workspaceSlug: string; itemId: string; }; },
) {
  const session = await auth();
  const body = await request.json();

  const validated = schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues },
      { status: 400 },
    );
  }
  const { content: _content } = validated.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:respond");

    // Verify that the itemId belongs to the specified workspace
    const existingItem = await prisma.inboxItem.findUnique({
      where: { id: params.itemId },
      select: { workspaceId: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    if (existingItem.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Inbox item does not belong to this workspace" }, {
        status: 403,
      });
    }

    // Reply functionality not yet implemented
    return NextResponse.json(
      { error: "Reply functionality not yet implemented" },
      { status: 501 },
    );
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to send reply";

    if (error instanceof Error) {
      const errWithStatus = error as Error & { status?: number; statusCode?: number; };
      // Prefer explicit status/statusCode properties if available
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
      } else if (error.name === "UnauthorizedError") {
        status = 401;
      } else if (error.name === "ForbiddenError") {
        status = 403;
      }
      if (error.message) {
        message = error.message;
      }
    }

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
