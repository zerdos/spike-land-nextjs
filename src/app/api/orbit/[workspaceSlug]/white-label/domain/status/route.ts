import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { calculateDaysUntilExpiration } from '@/lib/white-label/domain-verification';
import type { DomainStatusResponse } from '@/types/white-label';

/**
 * GET /api/orbit/[workspaceSlug]/white-label/domain/status
 * Check current domain verification and SSL status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
): Promise<NextResponse<DomainStatusResponse>> {
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

    const config = workspace.whiteLabelConfig;

    if (!config || !config.customDomain) {
      return NextResponse.json(
        { success: false, error: 'No custom domain configured' },
        { status: 404 }
      );
    }

    // Calculate days until SSL expiration
    const daysUntilExpiration = calculateDaysUntilExpiration(
      config.sslCertificateExpiresAt
    );

    return NextResponse.json({
      success: true,
      data: {
        dnsVerificationStatus: config.dnsVerificationStatus,
        sslCertificateStatus: config.sslCertificateStatus,
        customDomainVerified: config.customDomainVerified,
        sslCertificateIssuedAt: config.sslCertificateIssuedAt,
        sslCertificateExpiresAt: config.sslCertificateExpiresAt,
        daysUntilExpiration: daysUntilExpiration ?? undefined,
      },
    });
  } catch (error) {
    console.error('Error checking domain status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
