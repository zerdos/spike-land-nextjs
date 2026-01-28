/**
 * Relay Draft Generation API
 *
 * POST /api/orbit/[workspaceSlug]/relay/drafts - Generate response drafts for an inbox item
 *
 * Request Body:
 * - inboxItemId: Required. ID of the inbox item to generate drafts for
 * - numDrafts: Optional. Number of drafts to generate (1-5, default: 3)
 * - customInstructions: Optional. Custom instructions for generation
 *
 * Resolves #555: Implement Relay draft generation
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateDrafts, type InboxItemData, saveDraftsToDatabase } from "@/lib/relay";
import { tryCatch } from "@/lib/try-catch";
import { generateDraftsRequestSchema } from "@/lib/validations/relay-draft";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

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
        name: true,
      },
    }),
  );

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 },
    );
  }

  // Parse and validate request body
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parseResult = generateDraftsRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const { inboxItemId, numDrafts, customInstructions } = parseResult.data;

  // Fetch inbox item and verify it belongs to the workspace
  const { data: inboxItem, error: inboxError } = await tryCatch(
    prisma.inboxItem.findFirst({
      where: {
        id: inboxItemId,
        workspaceId: workspace.id,
      },
    }),
  );

  if (inboxError || !inboxItem) {
    return NextResponse.json(
      { error: "Inbox item not found" },
      { status: 404 },
    );
  }

  // Transform to InboxItemData type
  const inboxItemData: InboxItemData = {
    id: inboxItem.id,
    type: inboxItem.type,
    status: inboxItem.status,
    platform: inboxItem.platform,
    platformItemId: inboxItem.platformItemId,
    content: inboxItem.content,
    senderName: inboxItem.senderName,
    senderHandle: inboxItem.senderHandle,
    senderAvatarUrl: inboxItem.senderAvatarUrl,
    originalPostId: inboxItem.originalPostId,
    originalPostContent: inboxItem.originalPostContent,
    metadata: inboxItem.metadata as Record<string, unknown> | null,
    receivedAt: inboxItem.receivedAt,
    readAt: inboxItem.readAt,
    repliedAt: inboxItem.repliedAt,
    workspaceId: inboxItem.workspaceId,
    accountId: inboxItem.accountId,
    createdAt: inboxItem.createdAt,
    updatedAt: inboxItem.updatedAt,
  };

  // Generate drafts
  const { data: result, error: generateError } = await tryCatch(
    generateDrafts({
      inboxItem: inboxItemData,
      workspaceId: workspace.id,
      numDrafts,
      customInstructions,
    }),
  );

  if (generateError) {
    console.error("Failed to generate drafts:", generateError);
    return NextResponse.json(
      { error: "Failed to generate drafts" },
      { status: 500 },
    );
  }

  // Save drafts to database
  const { error: saveError } = await tryCatch(
    saveDraftsToDatabase(inboxItemId, result.drafts),
  );

  if (saveError) {
    console.error("Failed to save drafts:", saveError);
    // Still return the drafts even if save failed
    return NextResponse.json({
      ...result,
      saved: false,
      warning: "Drafts generated but failed to save to database",
    });
  }

  return NextResponse.json({
    ...result,
    saved: true,
  });
}

/**
 * GET /api/orbit/[workspaceSlug]/relay/drafts - Get drafts for inbox item or queue
 *
 * Query Parameters:
 * - inboxItemId: ID of the inbox item (required if queue is not set)
 * - queue: If "true", returns all drafts for the workspace (approval queue view)
 * - status: Filter by status (PENDING, APPROVED, REJECTED, SENT, FAILED)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceSlug } = await params;

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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const inboxItemId = searchParams.get("inboxItemId");
  const isQueueView = searchParams.get("queue") === "true";
  const statusFilter = searchParams.get("status");

  // Queue view: return all drafts for the workspace with inbox item details
  if (isQueueView) {
    const whereClause: Record<string, unknown> = {
      inboxItem: {
        workspaceId: workspace.id,
      },
    };

    if (statusFilter) {
      whereClause["status"] = statusFilter;
    }

    const { data: drafts, error: draftsError } = await tryCatch(
      prisma.relayDraft.findMany({
        where: whereClause,
        include: {
          inboxItem: {
            select: {
              id: true,
              platform: true,
              senderName: true,
              senderHandle: true,
              content: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 100,
      }),
    );

    if (draftsError) {
      console.error("Failed to fetch drafts queue:", draftsError);
      return NextResponse.json(
        { error: "Failed to fetch drafts" },
        { status: 500 },
      );
    }

    return NextResponse.json(drafts);
  }

  // Regular view: get drafts for a specific inbox item
  if (!inboxItemId) {
    return NextResponse.json(
      { error: "inboxItemId is required" },
      { status: 400 },
    );
  }

  // Verify inbox item belongs to workspace
  const { data: inboxItem, error: inboxError } = await tryCatch(
    prisma.inboxItem.findFirst({
      where: {
        id: inboxItemId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    }),
  );

  if (inboxError || !inboxItem) {
    return NextResponse.json(
      { error: "Inbox item not found" },
      { status: 404 },
    );
  }

  // Fetch drafts
  const { data: drafts, error: draftsError } = await tryCatch(
    prisma.relayDraft.findMany({
      where: { inboxItemId },
      orderBy: [{ isPreferred: "desc" }, { confidenceScore: "desc" }],
    }),
  );

  if (draftsError) {
    console.error("Failed to fetch drafts:", draftsError);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 },
    );
  }

  return NextResponse.json(drafts);
}
