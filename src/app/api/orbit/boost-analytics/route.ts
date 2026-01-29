/**
 * Boost Analytics API - Issue #570
 *
 * Main endpoint for boost analytics operations
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { BoostCampaignService } from '@/lib/boost-analytics/boost-campaign-service';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';

// Request validation schemas
const CreateBoostCampaignSchema = z.object({
  workspaceId: z.string(),
  originalPostId: z.string().nullable().optional(),
  campaignId: z.string(),
  boostedBy: z.string(),
  boostReason: z.string(),
  boostStrategy: z.string(),
  organicMetrics: z.object({
    impressions: z.number(),
    engagement: z.number(),
    reach: z.number(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    capturedAt: z.coerce.date(),
  }),
  targetingCriteria: z.object({}).optional(),
  initialBudget: z.number(),
  duration: z.number(),
});

const ListFiltersSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minBudget: z.coerce.number().optional(),
  maxBudget: z.coerce.number().optional(),
  boostStrategy: z.string().optional(),
  sortBy: z.enum(['createdAt', 'boostedAt', 'initialBudget']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().optional(),
});

/**
 * GET /api/orbit/boost-analytics
 * List boost campaigns for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }

    // Parse filters
    const filters = ListFiltersSchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const boostCampaignService = new BoostCampaignService(prisma);
    const boostCampaigns = await boostCampaignService.listBoostCampaigns(
      workspaceId,
      filters
    );

    return NextResponse.json({
      success: true,
      boostCampaigns,
      count: boostCampaigns.length,
    });
  } catch (error) {
    console.error('Error listing boost campaigns:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orbit/boost-analytics
 * Create a new boost campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = CreateBoostCampaignSchema.parse(body);

    // Verify user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: data.workspaceId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }

    // Verify campaign exists
    const campaign = await prisma.allocatorCampaign.findUnique({
      where: { id: data.campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify post exists (if provided)
    if (data.originalPostId) {
      const post = await prisma.socialPost.findUnique({
        where: { id: data.originalPostId },
      });

      if (!post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
    }

    const boostCampaignService = new BoostCampaignService(prisma);
    const boostCampaign = await boostCampaignService.createBoostCampaign(data);

    return NextResponse.json({
      success: true,
      boostCampaign,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating boost campaign:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
