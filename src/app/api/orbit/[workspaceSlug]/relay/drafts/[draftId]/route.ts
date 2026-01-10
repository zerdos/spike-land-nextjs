/**
 * Relay Draft Actions API
 *
 * PATCH /api/orbit/[workspaceSlug]/relay/drafts/[draftId] - Update draft status (approve/reject)
 *
 * Request Body:
 * - action: Required. "approve" | "reject"
 *
 * Resolves #555: Implement Relay draft generation
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { approveDraft, rejectDraft } from "@/lib/relay";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; draftId: string; }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, draftId } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { action } = body as { action?: string; };

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // Verify draft exists and belongs to workspace
  const { data: draft, error: draftError } = await tryCatch(
    prisma.relayDraft.findFirst({
      where: {
        id: draftId,
        inboxItem: {
          workspaceId: workspace.id,
        },
      },
      include: {
        inboxItem: {
          select: { id: true, status: true },
        },
      },
    }),
  );

  if (draftError || !draft) {
    return NextResponse.json(
      { error: "Draft not found" },
      { status: 404 },
    );
  }

  // Perform action
  const { data: updatedDraft, error: updateError } = await tryCatch(
    action === "approve"
      ? approveDraft(draftId, session.user.id)
      : rejectDraft(draftId, session.user.id),
  );

  if (updateError) {
    console.error(`Failed to ${action} draft:`, updateError);
    return NextResponse.json(
      { error: `Failed to ${action} draft` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    draft: updatedDraft,
    action,
  });
}

/**
 * GET /api/orbit/[workspaceSlug]/relay/drafts/[draftId] - Get a specific draft
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug, draftId } = await params;

  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workspace by slug
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Fetch draft with inbox item details
  const { data: draft, error: draftError } = await tryCatch(
    prisma.relayDraft.findFirst({
      where: {
        id: draftId,
        inboxItem: {
          workspaceId: workspace.id,
        },
      },
      include: {
        inboxItem: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  );

  if (draftError || !draft) {
    return NextResponse.json(
      { error: "Draft not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ draft });
}
