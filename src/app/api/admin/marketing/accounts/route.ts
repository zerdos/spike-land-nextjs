/**
 * Marketing Accounts API Route
 *
 * GET /api/admin/marketing/accounts - List connected marketing accounts
 * DELETE /api/admin/marketing/accounts - Disconnect an account
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    console.error("Failed to fetch marketing accounts:", sessionError);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const { data: isAdmin, error: adminError } = await tryCatch(
    isAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Failed to fetch marketing accounts:", adminError);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: accounts, error: accountsError } = await tryCatch(
    prisma.marketingAccount.findMany({
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
    }),
  );

  if (accountsError) {
    console.error("Failed to fetch marketing accounts:", accountsError);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  // Check if tokens are expired
  const accountsWithStatus = accounts.map((account) => ({
    ...account,
    tokenStatus: account.expiresAt && new Date(account.expiresAt) < new Date()
      ? "expired"
      : "valid",
  }));

  return NextResponse.json({ accounts: accountsWithStatus });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    console.error("Failed to disconnect account:", sessionError);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const { data: isAdmin, error: adminError } = await tryCatch(
    isAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Failed to disconnect account:", adminError);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Failed to disconnect account:", bodyError);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }

  const { accountId } = body;

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID is required" },
      { status: 400 },
    );
  }

  // Soft delete by setting isActive to false
  const { data: account, error: updateError } = await tryCatch(
    prisma.marketingAccount.updateMany({
      where: {
        id: accountId,
        userId: session.user.id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    }),
  );

  if (updateError) {
    console.error("Failed to disconnect account:", updateError);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }

  if (account.count === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
