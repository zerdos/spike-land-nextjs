import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import { executeBulkOperation } from "@/lib/workspace/bulk-operations";
import type { CreateBulkOperationRequest } from "@/types/bulk-operations";

/**
 * GET /api/workspaces/bulk/operations
 * List all bulk operations for the authenticated user
 */
export async function GET(_request: NextRequest) {
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

    const operations = await prisma.bulkOperation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      operations,
      total: operations.length,
    });
  } catch (error) {
    console.error("Error fetching bulk operations:", error);
    return NextResponse.json(
      { error: "Failed to fetch bulk operations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/bulk/operations
 * Create and optionally execute a bulk operation
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

    const body: CreateBulkOperationRequest & { executeNow?: boolean } =
      await request.json();

    // Validate that user has access to all specified workspaces
    const accessibleWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        workspaceId: { in: body.workspaceIds },
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
          error: "Access denied to some workspaces",
          inaccessibleWorkspaces,
        },
        { status: 403 }
      );
    }

    // Create bulk operation
    const operation = await prisma.bulkOperation.create({
      data: {
        userId: user.id,
        type: body.type,
        workspaceIds: body.workspaceIds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        operationData: body.operationData as any,
        totalCount: body.workspaceIds.length,
      },
    });

    // Execute immediately if requested
    if (body.executeNow) {
      // Execute in background (don't await)
      executeBulkOperation(operation.id).catch((err) => {
        console.error("Error executing bulk operation:", err);
      });
    }

    return NextResponse.json(operation, { status: 201 });
  } catch (error) {
    console.error("Error creating bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to create bulk operation" },
      { status: 500 }
    );
  }
}
