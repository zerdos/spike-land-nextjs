
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listInboxItems } from '@/lib/inbox/inbox-manager';
import { InboxItemFilter, InboxItemStatus, InboxItemType, SocialPlatform } from '@/lib/inbox/types';
import { requireWorkspacePermission } from '@/lib/permissions/workspace-middleware';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  status: z.union([z.enum(Object.values(InboxItemStatus) as [string, ...string[]]), z.array(z.enum(Object.values(InboxItemStatus) as [string, ...string[]]))]).optional(),
  type: z.union([z.enum(Object.values(InboxItemType) as [string, ...string[]]), z.array(z.enum(Object.values(InboxItemType) as [string, ...string[]]))]).optional(),
  platform: z.union([z.enum(Object.values(SocialPlatform) as [string, ...string[]]), z.array(z.enum(Object.values(SocialPlatform) as [string, ...string[]]))]).optional(),
  assignedToId: z.string().optional(),
  accountId: z.string().optional(),
  receivedAfter: z.string().optional(),
  receivedBefore: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { workspaceSlug: string } },
) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  const validated = schema.safeParse(query);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.errors },
      { status: 400 },
    );
  }
  const {
    status,
    type,
    platform,
    assignedToId,
    accountId,
    receivedAfter,
    receivedBefore,
    page,
    limit,
    orderBy,
    orderDirection,
  } = validated.data;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    await requireWorkspacePermission(session, workspace.id, 'inbox:view');

    const filter: InboxItemFilter = { workspaceId: workspace.id };
    if (status) filter.status = Array.isArray(status) ? status : [status];
    if (type) filter.type = Array.isArray(type) ? type : [type];
    if (platform) filter.platform = Array.isArray(platform) ? platform : [platform];
    if (assignedToId) filter.assignedToId = assignedToId;
    if (accountId) filter.accountId = accountId;
    if (receivedAfter) filter.receivedAfter = new Date(receivedAfter);
    if (receivedBefore) filter.receivedBefore = new Date(receivedBefore);

    const pagination = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy: orderBy as any,
      orderDirection: orderDirection as any,
    };

    const data = await listInboxItems(filter, pagination);

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error(error);

    const status =
      typeof (error as any)?.status === 'number'
        ? (error as any).status
        : typeof (error as any)?.statusCode === 'number'
          ? (error as any).statusCode
          : 500;

    const message =
      typeof (error as any)?.message === 'string' && (error as any).message.length > 0
        ? (error as any).message
        : 'Failed to list inbox items';

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
