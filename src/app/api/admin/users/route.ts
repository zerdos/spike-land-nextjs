/**
 * User Management API Route
 *
 * Search users, view details, grant/revoke admin role, adjust tokens.
 */

import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { requireAdminByUserId, isSuperAdmin } from "@/lib/auth/admin-middleware"
import prisma from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const userId = searchParams.get("userId")

    // Get specific user details
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tokenBalance: true,
          tokenTransactions: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
          enhancedImages: {
            select: { _count: true },
          },
          accounts: {
            select: { provider: true },
          },
        },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tokenBalance: user.tokenBalance?.balance || 0,
          imageCount: user.enhancedImages.length,
          authProviders: user.accounts.map((a) => a.provider),
          createdAt: user.createdAt.toISOString(),
          recentTransactions: user.tokenTransactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            createdAt: t.createdAt.toISOString(),
          })),
        },
      })
    }

    // Search users
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const users = await prisma.user.findMany({
      where,
      include: {
        tokenBalance: {
          select: { balance: true },
        },
        _count: {
          select: {
            enhancedImages: true,
          },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image,
        role: u.role,
        tokenBalance: u.tokenBalance?.balance || 0,
        imageCount: u._count.enhancedImages,
        createdAt: u.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    const body = await request.json()
    const { userId, action, value } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: userId, action" },
        { status: 400 }
      )
    }

    // Handle role change
    if (action === "setRole") {
      if (!Object.values(UserRole).includes(value)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }

      // Only super admins can create other super admins
      if (value === UserRole.SUPER_ADMIN) {
        const isSuperAdminUser = await isSuperAdmin(session.user.id)
        if (!isSuperAdminUser) {
          return NextResponse.json(
            { error: "Only super admins can create super admins" },
            { status: 403 }
          )
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role: value },
      })

      return NextResponse.json({ success: true, role: value })
    }

    // Handle token adjustment
    if (action === "adjustTokens") {
      const amount = parseInt(value)
      if (isNaN(amount)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }

      // Get or create token balance
      const tokenBalance = await prisma.userTokenBalance.upsert({
        where: { userId },
        update: {
          balance: {
            increment: amount,
          },
        },
        create: {
          userId,
          balance: Math.max(0, amount),
        },
      })

      // Create transaction record
      await prisma.tokenTransaction.create({
        data: {
          userId,
          amount,
          type: amount > 0 ? "EARN_BONUS" : "SPEND_ENHANCEMENT",
          source: "admin_adjustment",
          sourceId: session.user.id,
          balanceAfter: tokenBalance.balance + amount,
          metadata: {
            adjustedBy: session.user.id,
            reason: "Manual admin adjustment",
          },
        },
      })

      return NextResponse.json({
        success: true,
        newBalance: tokenBalance.balance + amount,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Failed to update user:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
