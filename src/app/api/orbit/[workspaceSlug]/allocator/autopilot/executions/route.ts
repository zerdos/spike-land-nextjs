import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceSlug } = await params;
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id }
      }
    }
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 404 });
  }

  const executions = await prisma.allocatorAutopilotExecution.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { executedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      campaign: {
        select: { name: true, platform: true }
      }
    }
  });

  const total = await prisma.allocatorAutopilotExecution.count({
    where: { workspaceId: workspace.id }
  });

  return NextResponse.json({
    executions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
