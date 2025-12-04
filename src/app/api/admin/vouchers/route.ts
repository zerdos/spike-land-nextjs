/**
 * Voucher Management API Route
 *
 * CRUD operations for vouchers (admin only).
 */

import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/auth"
import { requireAdminByUserId } from "@/lib/auth/admin-middleware"
import prisma from "@/lib/prisma"
import { VoucherType, VoucherStatus } from "@prisma/client"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    const vouchers = await prisma.voucher.findMany({
      include: {
        redemptions: {
          select: {
            userId: true,
            tokensGranted: true,
            redeemedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        type: v.type,
        value: v.value,
        maxUses: v.maxUses,
        currentUses: v.currentUses,
        expiresAt: v.expiresAt?.toISOString(),
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        redemptions: v.redemptions.length,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch vouchers:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    const body = await request.json()
    const { code, type, value, maxUses, expiresAt } = body

    // Validate input
    if (!code || !type || !value) {
      return NextResponse.json(
        { error: "Missing required fields: code, type, value" },
        { status: 400 }
      )
    }

    if (!Object.values(VoucherType).includes(type)) {
      return NextResponse.json({ error: "Invalid voucher type" }, { status: 400 })
    }

    // Check if code already exists
    const existing = await prisma.voucher.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Voucher code already exists" },
        { status: 409 }
      )
    }

    // Create voucher
    const voucher = await prisma.voucher.create({
      data: {
        code,
        type,
        value,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: VoucherStatus.ACTIVE,
      },
    })

    return NextResponse.json({
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        maxUses: voucher.maxUses,
        expiresAt: voucher.expiresAt?.toISOString(),
        status: voucher.status,
      },
    })
  } catch (error) {
    console.error("Failed to create voucher:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    const { searchParams } = new URL(request.url)
    const voucherId = searchParams.get("id")

    if (!voucherId) {
      return NextResponse.json(
        { error: "Voucher ID required" },
        { status: 400 }
      )
    }

    await prisma.voucher.delete({
      where: { id: voucherId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete voucher:", error)
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
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields: id, status" },
        { status: 400 }
      )
    }

    if (!Object.values(VoucherStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const voucher = await prisma.voucher.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({
      voucher: {
        id: voucher.id,
        status: voucher.status,
      },
    })
  } catch (error) {
    console.error("Failed to update voucher:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
