import { auth } from "@/auth";
import { archiveInboxItem, assignInboxItem, updateInboxItem } from "@/lib/inbox/inbox-manager";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { InboxItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.nativeEnum(InboxItemStatus).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function PATCH(
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
  const { status, assignedToId } = validated.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, {
        status: 404,
      });
    }

    await requireWorkspacePermission(session, workspace.id, "inbox:manage");

    // Verify that the itemId belongs to the specified workspace
    const existingItem = await prisma.inboxItem.findUnique({
      where: { id: params.itemId },
      select: { workspaceId: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Inbox item not found" }, {
        status: 404,
      });
    }

    if (existingItem.workspaceId !== workspace.id) {
      return NextResponse.json({
        error: "Inbox item does not belong to this workspace",
      }, {
        status: 403,
      });
    }

    let item;
    if (status) {
      if (status === "ARCHIVED") {
        item = await archiveInboxItem(params.itemId);
      } else {
        item = await updateInboxItem(params.itemId, {
          status,
          readAt: status === "READ" ? new Date() : null,
        });
      }
    }

    if (assignedToId !== undefined) {
      item = (await assignInboxItem(params.itemId, assignedToId)).item;
    }

    if (!item) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 },
      );
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error(error);

    let status = 500;
    let message = "Failed to update inbox item";

    if (error instanceof Error) {
      const errWithStatus = error as Error & {
        status?: number;
        statusCode?: number;
      };
      if (typeof errWithStatus.status === "number") {
        status = errWithStatus.status;
      } else if (typeof errWithStatus.statusCode === "number") {
        status = errWithStatus.statusCode;
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
