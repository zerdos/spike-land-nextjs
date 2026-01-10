/**
 * Individual Scout Suggestion API
 *
 * GET: Get suggestion details
 * PATCH: Update suggestion (accept, dismiss, mark used, add feedback)
 * DELETE: Delete suggestion
 */

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  acceptSuggestion,
  dismissSuggestion,
  getSuggestionById,
  markSuggestionUsed,
  submitFeedback,
} from "@/lib/scout/suggestion-manager";

interface RouteContext {
  params: Promise<{ workspaceSlug: string; suggestionId: string; }>;
}

/**
 * GET /api/orbit/[workspaceSlug]/scout/suggestions/[suggestionId]
 *
 * Get suggestion details
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug, suggestionId } = await context.params;

    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const suggestion = await getSuggestionById(suggestionId, workspace.id);

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Failed to get suggestion:", error);
    return NextResponse.json({ error: "Failed to get suggestion" }, { status: 500 });
  }
}

/**
 * PATCH /api/orbit/[workspaceSlug]/scout/suggestions/[suggestionId]
 *
 * Update suggestion status or add feedback
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug, suggestionId } = await context.params;

    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { action, reason, feedback } = body;

    let result;

    switch (action) {
      case "accept":
        result = await acceptSuggestion(suggestionId, workspace.id);
        break;

      case "dismiss":
        result = await dismissSuggestion(suggestionId, workspace.id, reason);
        break;

      case "use":
        result = await markSuggestionUsed(suggestionId, workspace.id);
        break;

      case "feedback":
        if (!feedback) {
          return NextResponse.json({ error: "Feedback data required" }, { status: 400 });
        }
        await submitFeedback(
          {
            suggestionId,
            helpful: feedback.helpful,
            reason: feedback.reason,
            improvementSuggestions: feedback.improvements,
          },
          workspace.id,
        );
        result = await getSuggestionById(suggestionId, workspace.id);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update suggestion:", error);
    return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
  }
}

/**
 * DELETE /api/orbit/[workspaceSlug]/scout/suggestions/[suggestionId]
 *
 * Delete a suggestion
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceSlug, suggestionId } = await context.params;

    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const deleted = await prisma.contentSuggestion.deleteMany({
      where: {
        id: suggestionId,
        workspaceId: workspace.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete suggestion:", error);
    return NextResponse.json({ error: "Failed to delete suggestion" }, { status: 500 });
  }
}
