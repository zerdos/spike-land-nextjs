import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { AutopilotService } from '@/lib/allocator/autopilot-service';
import { tryCatch } from '@/lib/try-catch';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve params
  const { workspaceSlug } = await params;

  // Resolve workspace by slug
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

  const { data: config, error } = await tryCatch(
    AutopilotService.getAutopilotConfig(workspace.id)
  );

  if (error) {
    console.error('Error fetching autopilot config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json({ config });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceSlug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

   // Resolve params
  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        where: { userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } }
      }
    }
  });

  if (!workspace || workspace.members.length === 0) {
    return NextResponse.json({ error: 'Access denied: Admin privileges required' }, { status: 403 });
  }

  const body = await req.json();

  const { data: config, error } = await tryCatch(
    AutopilotService.setAutopilotConfig(workspace.id, body)
  );

  if (error) {
    console.error('Error updating autopilot config:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json({ config });
}
