import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import { executeBulkOperation } from "@/lib/workspace/bulk-operations";
// import type { PublishPostData } from "@/types/bulk-operations";

/**
 * POST /api/workspaces/bulk/publish
 * Publish drafts across multiple workspaces
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body: {
      workspaceIds: string[];
      draftIds: string[];
    } = await request.json();

    // Validate access
    const accessibleWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        workspaceId: { in: body.workspaceIds },
        role: { in: ["OWNER", "ADMIN"] }, // Only admins can publish
      },
      select: { workspaceId: true },
    });

    const accessibleWorkspaceIds = new Set(
      accessibleWorkspaces.map((w) => w.workspaceId)
    );

    const inaccessibleWorkspaces = body.workspaceIds.filter(
      (id) => !accessibleWorkspaceIds.has(id)
    );

    if (inaccessibleWorkspaces.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient permissions for some workspaces",
          inaccessibleWorkspaces,
        },
        { status: 403 }
      );
    }

    // Create bulk operation
    const operation = await prisma.bulkOperation.create({
      data: {
        userId: user.id,
        type: "PUBLISH_POST",
        workspaceIds: body.workspaceIds,
        operationData: {
          type: "PUBLISH_POST",
          draftIds: body.draftIds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        totalCount: body.workspaceIds.length,
      },
    });

    // Execute immediately
    executeBulkOperation(operation.id).catch((err) => {
      console.error("Error executing bulk publish:", err);
    });

    return NextResponse.json(
      {
        operationId: operation.id,
        message: "Publishing drafts across workspaces",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error publishing drafts:", error);
    return NextResponse.json(
      { error: "Failed to publish drafts" },
      { status: 500 }
    );
  }
}
