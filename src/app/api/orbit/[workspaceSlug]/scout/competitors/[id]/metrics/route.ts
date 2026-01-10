
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { analyzeCompetitorEngagement, getTopCompetitorPosts } from '@/lib/scout/competitor-analyzer';

// GET - Fetches engagement metrics for a single competitor
export async function GET(
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

    // Parse and validate date parameters
    const { searchParams } = new URL(request.url);
    const rawStartDate = searchParams.get('startDate');
    const rawEndDate = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (rawStartDate) {
      startDate = new Date(rawStartDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate parameter' }, { status: 400 });
      }
    } else {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    if (rawEndDate) {
      endDate = new Date(rawEndDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate parameter' }, { status: 400 });
      }
    } else {
      endDate = new Date();
    }

    // Verify competitor belongs to the workspace
    const competitor = await prisma.scoutCompetitor.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    const engagementMetrics = await analyzeCompetitorEngagement(params.id, startDate, endDate);
    const topPosts = await getTopCompetitorPosts(params.id);

    return NextResponse.json({
      engagementMetrics,
      topPosts,
    });
  } catch (error) {
    console.error('Failed to fetch competitor metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
