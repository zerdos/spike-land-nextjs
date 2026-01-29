import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import prisma from "@/lib/prisma";
import {
  executeBulkOperation,
  cancelBulkOperation,
  getBulkOperationStatus,
} from "@/lib/workspace/bulk-operations";

interface Params {
  params: {
    operationId: string;
  };
}

/**
 * GET /api/workspaces/bulk/operations/[operationId]
 * Get a specific bulk operation
 */
export async function GET(_request: NextRequest, { params }: Params) {
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

    const operation = await prisma.bulkOperation.findFirst({
      where: {
        id: params.operationId,
        userId: user.id,
      },
    });

    if (!operation) {
      return NextResponse.json(
        { error: "Bulk operation not found" },
        { status: 404 }
      );
    }

    // Get current status
    const status = await getBulkOperationStatus(params.operationId);

    return NextResponse.json({
      ...operation,
      status,
    });
  } catch (error) {
    console.error("Error fetching bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to fetch bulk operation" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/bulk/operations/[operationId]
 * Execute a pending bulk operation
 */
export async function POST(_request: NextRequest, { params }: Params) {
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

    // Check if operation exists and belongs to user
    const existingOperation = await prisma.bulkOperation.findFirst({
      where: {
        id: params.operationId,
        userId: user.id,
      },
    });

    if (!existingOperation) {
      return NextResponse.json(
        { error: "Bulk operation not found" },
        { status: 404 }
      );
    }

    // Execute operation (don't await - run in background)
    executeBulkOperation(params.operationId).catch((err) => {
      console.error("Error executing bulk operation:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Bulk operation started",
    });
  } catch (error) {
    console.error("Error starting bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to start bulk operation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/bulk/operations/[operationId]
 * Cancel a bulk operation
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
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

    // Check if operation exists and belongs to user
    const existingOperation = await prisma.bulkOperation.findFirst({
      where: {
        id: params.operationId,
        userId: user.id,
      },
    });

    if (!existingOperation) {
      return NextResponse.json(
        { error: "Bulk operation not found" },
        { status: 404 }
      );
    }

    // Cancel operation
    const operation = await cancelBulkOperation(params.operationId);

    return NextResponse.json(operation);
  } catch (error) {
    console.error("Error cancelling bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to cancel bulk operation" },
      { status: 500 }
    );
  }
}
