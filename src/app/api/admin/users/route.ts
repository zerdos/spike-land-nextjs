/**
 * User Management API Route
 *
 * Search users, view details, grant/revoke admin role.
 */

import { auth } from "@/auth";
import { AuditLogger } from "@/lib/audit/logger";
import { isSuperAdmin, requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Validation constants
const MAX_SEARCH_LENGTH = 100;
// User ID pattern: accepts CUIDs and user_ prefixed IDs (stable IDs)
const CUID_PATTERN = /^(c[a-z0-9]{24}|user_[a-f0-9]+)$/;

async function handleGetUsers(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const userId = searchParams.get("userId");

  // Validate search query length
  if (search && search.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json(
      {
        error: `Search query too long (max ${MAX_SEARCH_LENGTH} characters)`,
      },
      { status: 400 },
    );
  }

  // Validate userId format
  if (userId && !CUID_PATTERN.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 },
    );
  }

  // Get specific user details
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enhancedImages: {
          select: { id: true },
        },
        accounts: {
          select: { provider: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        imageCount: user.enhancedImages.length,
        authProviders: user.accounts.map((a: { provider: string; }) => a.provider),
        createdAt: user.createdAt.toISOString(),
      },
    });
  }

  // Search users
  const where = search
    ? {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
      ],
    }
    : {};

  const users = await prisma.user.findMany({
    where,
    include: {
      _count: {
        select: {
          enhancedImages: true,
        },
      },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  type UserListItem = {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: UserRole;
    _count: { enhancedImages: number; };
    createdAt: Date;
  };
  return NextResponse.json({
    users: users.map((u: UserListItem) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      imageCount: u._count.enhancedImages,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function GET(request: NextRequest) {
  const { data, error } = await tryCatch(handleGetUsers(request));

  if (error) {
    console.error("Failed to fetch users:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return data;
}

async function handlePatchUser(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { userId, action, value } = body;

  if (!userId || !action) {
    return NextResponse.json(
      { error: "Missing required fields: userId, action" },
      { status: 400 },
    );
  }

  // Validate userId format
  if (!CUID_PATTERN.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 },
    );
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }

  // Handle role change
  if (action === "setRole") {
    if (!Object.values(UserRole).includes(value)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === session.user.id && value === UserRole.USER) {
      return NextResponse.json(
        { error: "Cannot demote yourself to USER role" },
        { status: 400 },
      );
    }

    // Only super admins can create other super admins
    if (value === UserRole.SUPER_ADMIN) {
      const isSuperAdminUser = await isSuperAdmin(session.user.id);
      if (!isSuperAdminUser) {
        return NextResponse.json(
          { error: "Only super admins can create super admins" },
          { status: 403 },
        );
      }
    }

    // Prevent demoting super admins (except by other super admins)
    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      value !== UserRole.SUPER_ADMIN
    ) {
      const isSuperAdminUser = await isSuperAdmin(session.user.id);
      if (!isSuperAdminUser) {
        return NextResponse.json(
          { error: "Only super admins can demote super admins" },
          { status: 403 },
        );
      }
    }

    const oldRole = targetUser.role;

    await prisma.user.update({
      where: { id: userId },
      data: { role: value },
    });

    // Log role change
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0] ??
      request.headers.get("x-real-ip") ?? undefined;
    await AuditLogger.logRoleChange(
      session.user.id,
      userId,
      oldRole,
      value,
      ipAddress,
    );

    return NextResponse.json({ success: true, role: value });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const { data, error } = await tryCatch(handlePatchUser(request));

  if (error) {
    console.error("Failed to update user:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return data;
}

async function handleDeleteUser(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required parameter: userId" },
      { status: 400 },
    );
  }

  // Validate userId format
  if (!CUID_PATTERN.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 },
    );
  }

  // Prevent self-deletion
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  // Get target user details
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      _count: {
        select: {
          albums: true,
          enhancedImages: true,
          enhancementJobs: true,
        },
      },
    },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }

  // Prevent deleting super admins (only super admins can delete super admins)
  if (targetUser.role === UserRole.SUPER_ADMIN) {
    const isSuperAdminUser = await isSuperAdmin(session.user.id);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: "Only super admins can delete super admins" },
        { status: 403 },
      );
    }
  }

  // Capture deletion stats before deleting
  const deletedData = {
    albums: targetUser._count.albums,
    images: targetUser._count.enhancedImages,
    enhancementJobs: targetUser._count.enhancementJobs,
  };

  // Delete user (cascade delete will handle related records)
  // The Prisma schema has onDelete: Cascade configured for all relations
  await prisma.user.delete({
    where: { id: userId },
  });

  // Log user deletion
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0] ??
    request.headers.get("x-real-ip") ?? undefined;
  await AuditLogger.logUserDelete(
    session.user.id,
    userId,
    targetUser.email,
    targetUser.name,
    deletedData,
    ipAddress,
  );

  return NextResponse.json({
    success: true,
    message: "User deleted successfully",
    deletedData,
  });
}

export async function DELETE(request: NextRequest) {
  const { data, error } = await tryCatch(handleDeleteUser(request));

  if (error) {
    console.error("Failed to delete user:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return data;
}
