
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Removes a competitor from a workspace
export async function DELETE(
  request: Request,
  { params }: { params: { workspaceSlug: string; id: string } }
) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find workspace by slug and verify user is a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: params.workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify competitor belongs to the workspace before deleting
    const competitor = await prisma.scoutCompetitor.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Delete competitor (posts will be cascade deleted by Prisma schema)
    await prisma.scoutCompetitor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
