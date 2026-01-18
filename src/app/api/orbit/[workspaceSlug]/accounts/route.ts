/**
 * Workspace Social Accounts API
 *
 * GET /api/orbit/[workspaceSlug]/accounts - List connected social accounts
 * DELETE /api/orbit/[workspaceSlug]/accounts?accountId=xxx - Disconnect an account
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ workspaceSlug: string; }>;
}

// GET /api/orbit/[workspaceSlug]/accounts - List connected social accounts
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  const session = await auth();

  // Look up workspace by slug
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check permissions (any member can view accounts)
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspace.id, "social:view"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Fetch social accounts with health status
  const { data: accounts, error } = await tryCatch(
    prisma.socialAccount.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        status: true,
        connectedAt: true,
        metadata: true,
        health: {
          select: {
            healthScore: true,
            status: true,
            lastSuccessfulSync: true,
            isRateLimited: true,
            tokenRefreshRequired: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    }),
  );

  if (error) {
    console.error("Failed to fetch social accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }

  return NextResponse.json({ accounts: accounts || [] });
}

// DELETE /api/orbit/[workspaceSlug]/accounts?accountId=xxx - Disconnect an account
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { workspaceSlug } = await params;
  const session = await auth();

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Look up workspace by slug
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check permissions (need social:disconnect to remove accounts)
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspace.id, "social:disconnect"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Verify account belongs to this workspace
  const account = await prisma.socialAccount.findFirst({
    where: {
      id: accountId,
      workspaceId: workspace.id,
    },
  });

  if (!account) {
    return NextResponse.json(
      { error: "Account not found in this workspace" },
      { status: 404 },
    );
  }

  // Soft disconnect - set status to DISCONNECTED rather than deleting
  const { error: updateError } = await tryCatch(
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: "DISCONNECTED" },
    }),
  );

  if (updateError) {
    console.error("Failed to disconnect account:", updateError);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
