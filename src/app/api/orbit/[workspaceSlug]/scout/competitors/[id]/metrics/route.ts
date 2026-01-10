
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeCompetitorEngagement, getTopCompetitorPosts } from '@/lib/scout/competitor-analyzer';

// GET - Fetches engagement metrics for a single competitor
export async function GET(
  request: Request,
  { params }: { params: { workspaceSlug: string; id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

    const competitor = await prisma.scoutCompetitor.findUnique({
      where: { id: params.id },
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
