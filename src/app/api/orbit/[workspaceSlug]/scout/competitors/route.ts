
import { NextResponse } from 'next/server';
import { SocialPlatform } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { addCompetitor } from '@/lib/scout/competitor-tracker';

// GET - Fetches all competitors for a workspace
export async function GET(
  request: Request,
  { params }: { params: { workspaceSlug: string } }
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const competitors = await prisma.scoutCompetitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Adds a new competitor to a workspace
export async function POST(
  request: Request,
  { params }: { params: { workspaceSlug: string } }
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.workspaceSlug },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const { platform, handle } = await request.json();

    if (!platform || !handle) {
      return NextResponse.json({ error: 'Platform and handle are required' }, { status: 400 });
    }

    const competitor = await addCompetitor(workspace.id, platform as SocialPlatform, handle);

    if (!competitor) {
      return NextResponse.json({ error: 'Failed to validate or add competitor' }, { status: 400 });
    }

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('Failed to add competitor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
