import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  generateVerificationToken,
  getVerificationInstructions,
  isValidDomain,
} from '@/lib/white-label/domain-verification';
import type { DomainVerificationResponse } from '@/types/white-label';

/**
 * POST /api/orbit/[workspaceSlug]/white-label/domain/verify
 * Start domain verification process
 * Requires OWNER or ADMIN role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
): Promise<NextResponse<DomainVerificationResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceSlug } = await params;
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      );
    }

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain format' },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Only workspace owners and admins can configure custom domains' },
        { status: 403 }
      );
    }

    // Check subscription tier (PRO or BUSINESS required)
    if (workspace.subscriptionTier === 'FREE') {
      return NextResponse.json(
        { success: false, error: 'Custom domains require PRO or BUSINESS subscription' },
        { status: 403 }
      );
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Update white-label config with domain and token
    await prisma.workspaceWhiteLabelConfig.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        customDomain: domain,
        dnsVerificationToken: verificationToken,
        dnsVerificationStatus: 'PENDING',
      },
      update: {
        customDomain: domain,
        dnsVerificationToken: verificationToken,
        dnsVerificationStatus: 'PENDING',
        customDomainVerified: false,
      },
    });

    // Get verification instructions
    const instructions = getVerificationInstructions(domain, verificationToken);

    return NextResponse.json({
      success: true,
      data: {
        verificationToken,
        instructions,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Error initiating domain verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
