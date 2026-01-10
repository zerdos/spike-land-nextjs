/**
 * Relay Draft Actions API
 *
 * PATCH /api/orbit/[workspaceSlug]/relay/drafts/[draftId] - Update draft (approve/reject/edit/send)
 * GET /api/orbit/[workspaceSlug]/relay/drafts/[draftId] - Get draft with history
 *
 * Request Body for PATCH:
 * - action: Required. "approve" | "reject" | "edit" | "send"
 * - content: Required for "edit" action
 * - reason: Optional note for action
 *
 * Resolves #555, #569
 */

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  approveDraftWorkflow,
  editDraft,
  getDraftWithHistory,
  markDraftAsFailed,
  markDraftAsSent,
  rejectDraftWorkflow,
} from "@/lib/relay";
import { tryCatch } from "@/lib/try-catch";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; draftId: string; }>;
}

type ActionType = "approve" | "reject" | "edit" | "send" | "fail";

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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, content, reason, note, errorMessage } = body as {
    action?: string;
    content?: string;
    reason?: string;
    note?: string;
    errorMessage?: string;
  };

  const validActions: ActionType[] = ["approve", "reject", "edit", "send", "fail"];
  if (!action || !validActions.includes(action as ActionType)) {
    return NextResponse.json(
      { error: `action must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate edit action has content
  if (action === "edit" && !content) {
    return NextResponse.json(
      { error: "content is required for edit action" },
      { status: 400 },
    );
  }

  // Validate reject action has reason
  if (action === "reject" && !reason) {
    return NextResponse.json(
      { error: "reason is required for reject action" },
      { status: 400 },
    );
  }

  // Validate fail action has errorMessage
  if (action === "fail" && !errorMessage) {
    return NextResponse.json(
      { error: "errorMessage is required for fail action" },
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
    }),
  );

  if (draftError || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Get request metadata for audit log
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  // Perform action
  try {
    switch (action as ActionType) {
      case "approve": {
        const result = await approveDraftWorkflow(
          { draftId, note },
          session.user.id,
          ipAddress,
          userAgent,
        );
        return NextResponse.json({
          draft: result.draft,
          auditLog: result.auditLog,
          action,
          success: result.success,
          message: result.message,
        });
      }

      case "reject": {
        const result = await rejectDraftWorkflow(
          { draftId, reason: reason! },
          session.user.id,
          ipAddress,
          userAgent,
        );
        return NextResponse.json({
          draft: result.draft,
          auditLog: result.auditLog,
          action,
          success: result.success,
          message: result.message,
        });
      }

      case "edit": {
        const result = await editDraft(
          { draftId, content: content!, reason },
          session.user.id,
          ipAddress,
          userAgent,
        );
        return NextResponse.json({
          draft: result.draft,
          editHistory: result.editHistory,
          editType: result.editType,
          action,
          success: true,
          message: "Draft edited successfully",
        });
      }

      case "send": {
        const result = await markDraftAsSent(
          draftId,
          session.user.id,
          ipAddress,
          userAgent,
        );
        return NextResponse.json({
          draft: result.draft,
          auditLog: result.auditLog,
          action,
          success: result.success,
          message: result.message,
        });
      }

      case "fail": {
        const result = await markDraftAsFailed(
          draftId,
          errorMessage!,
          session.user.id,
          ipAddress,
          userAgent,
        );
        return NextResponse.json({
          draft: result.draft,
          auditLog: result.auditLog,
          action,
          success: false,
          message: result.message,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(`Failed to ${action} draft:`, error);
    return NextResponse.json(
      {
        error: `Failed to ${action} draft`,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/orbit/[workspaceSlug]/relay/drafts/[draftId] - Get a specific draft with history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  // Check if history is requested
  const includeHistory = request.nextUrl.searchParams.get("includeHistory") === "true";

  if (includeHistory) {
    // Get draft with full history using the workflow function
    const { data: draftWithHistory, error: historyError } = await tryCatch(
      getDraftWithHistory(draftId),
    );

    if (historyError || !draftWithHistory) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Verify draft belongs to workspace
    const { data: verifyDraft } = await tryCatch(
      prisma.relayDraft.findFirst({
        where: {
          id: draftId,
          inboxItem: {
            workspaceId: workspace.id,
          },
        },
        select: { id: true },
      }),
    );

    if (!verifyDraft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({
      draft: draftWithHistory,
      editHistory: draftWithHistory.editHistory,
      auditLogs: draftWithHistory.auditLogs,
    });
  }

  // Fetch basic draft with inbox item details
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
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}
