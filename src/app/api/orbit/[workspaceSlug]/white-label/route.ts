import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  whiteLabelConfigPatchSchema,
  type WhiteLabelConfigResponse,
} from '@/types/white-label';

/**
 * GET /api/orbit/[workspaceSlug]/white-label
 * Fetch workspace white-label configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
): Promise<NextResponse<WhiteLabelConfigResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceSlug } = await params;

    // Find workspace and check membership
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
        whiteLabelConfig: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (workspace.members.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Check subscription tier (PRO or BUSINESS required)
    if (workspace.subscriptionTier === 'FREE') {
      return NextResponse.json(
        { success: false, error: 'White-label features require PRO or BUSINESS subscription' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workspace.whiteLabelConfig ?? undefined,
    });
  } catch (error) {
    console.error('Error fetching white-label config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orbit/[workspaceSlug]/white-label
 * Update workspace white-label configuration (partial updates)
 * Requires OWNER or ADMIN role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
): Promise<NextResponse<WhiteLabelConfigResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceSlug } = await params;

    // Find workspace and check membership/role
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const member = workspace.members[0];
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Check role (OWNER or ADMIN only)
    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only workspace owners and admins can configure white-label settings' },
        { status: 403 }
      );
    }

    // Check subscription tier (PRO or BUSINESS required)
    if (workspace.subscriptionTier === 'FREE') {
      return NextResponse.json(
        { success: false, error: 'White-label features require PRO or BUSINESS subscription' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = whiteLabelConfigPatchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Upsert white-label configuration
    const whiteLabelConfig = await prisma.workspaceWhiteLabelConfig.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      data: whiteLabelConfig,
    });
  } catch (error) {
    console.error('Error updating white-label config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orbit/[workspaceSlug]/white-label
 * Remove white-label configuration (reset to defaults)
 * Requires OWNER role
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
): Promise<NextResponse<WhiteLabelConfigResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceSlug } = await params;

    // Find workspace and check membership/role
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const member = workspace.members[0];
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Check role (OWNER only for deletion)
    if (member.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only workspace owners can delete white-label configuration' },
        { status: 403 }
      );
    }

    // Check subscription tier (PRO or BUSINESS required)
    if (workspace.subscriptionTier === 'FREE') {
      return NextResponse.json(
        { success: false, error: 'White-label features require PRO or BUSINESS subscription' },
        { status: 403 }
      );
    }

    // Delete white-label configuration
    try {
      await prisma.workspaceWhiteLabelConfig.delete({
        where: { workspaceId: workspace.id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record didn't exist, considered success
        return NextResponse.json({
          success: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting white-label config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
