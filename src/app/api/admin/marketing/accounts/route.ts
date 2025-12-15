/**
 * Marketing Accounts API Route
 *
 * GET /api/admin/marketing/accounts - List connected marketing accounts
 * DELETE /api/admin/marketing/accounts - Disconnect an account
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const isAdmin = await isAdminByUserId(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accounts = await prisma.marketingAccount.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check if tokens are expired
    const accountsWithStatus = accounts.map((account) => ({
      ...account,
      tokenStatus: account.expiresAt && new Date(account.expiresAt) < new Date()
        ? "expired"
        : "valid",
    }));

    return NextResponse.json({ accounts: accountsWithStatus });
  } catch (error) {
    console.error("Failed to fetch marketing accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const isAdmin = await isAdminByUserId(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 },
      );
    }

    // Soft delete by setting isActive to false
    const account = await prisma.marketingAccount.updateMany({
      where: {
        id: accountId,
        userId: session.user.id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    if (account.count === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }
}
