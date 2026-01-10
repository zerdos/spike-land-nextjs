
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspacePermission } from '@/lib/permissions/workspace-middleware';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  content: z.string().min(1),
});

export async function POST(
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
  const { content } = validated.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    await requireWorkspacePermission(session, workspace.id, 'inbox:respond');

    // TODO: Implement the actual reply logic in inbox-manager.ts
    console.log(`Replying to item ${params.itemId} with content: ${content}`);

    return NextResponse.json({ success: true, message: 'Reply sent' });
  } catch (error: any) {
    console.error(error);
    const status = error.message.includes("Unauthorized") ? 401 : error.message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status },
    );
  }
}
