
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateInboxItem, assignInboxItem, archiveInboxItem } from '@/lib/inbox/inbox-manager';
import { InboxItemStatus } from '@/lib/inbox/types';
import { requireWorkspacePermission } from '@/lib/permissions/workspace-middleware';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  status: z.nativeEnum(InboxItemStatus).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { workspaceSlug: string; itemId: string } },
) {
  const session = await auth();
  const body = await request.json();

  const validated = schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.errors },
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
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    await requireWorkspacePermission(session, workspace.id, 'inbox:manage');

    let item;
    if (status) {
      if (status === 'ARCHIVED') {
        item = await archiveInboxItem(params.itemId);
      } else {
        item = await updateInboxItem(params.itemId, { status, readAt: status === 'READ' ? new Date() : null });
      }
    }

    if (assignedToId !== undefined) {
      item = (await assignInboxItem(params.itemId, assignedToId)).item;
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error(error);
    const status = error.message.includes("Unauthorized") ? 401 : error.message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to update inbox item' },
      { status },
    );
  }
}
