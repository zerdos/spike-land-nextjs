/**
 * Voucher Management API Route
 *
 * CRUD operations for vouchers (admin only).
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { VoucherStatus, VoucherType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type VoucherItem = {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: Date | null;
  status: VoucherStatus;
  createdAt: Date;
  redemptions: {
    userId: string;
    tokensGranted: number;
    redeemedAt: Date;
  }[];
};

function handleError(error: Error | null, context: string): NextResponse {
  console.error(`Failed to ${context}:`, error);
  if (error instanceof Error && error.message.includes("Forbidden")) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export async function GET() {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    return handleError(sessionError, "fetch vouchers");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "fetch vouchers");
  }

  const { data: vouchers, error: fetchError } = await tryCatch(
    prisma.voucher.findMany({
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
    }),
  );

  if (fetchError) {
    return handleError(fetchError, "fetch vouchers");
  }

  return NextResponse.json({
    vouchers: vouchers.map((v: VoucherItem) => ({
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
  });
}

export async function POST(request: NextRequest) {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    return handleError(sessionError, "create voucher");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "create voucher");
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return handleError(parseError, "create voucher");
  }

  const { code, type, value, maxUses, expiresAt } = body;

  // Validate input
  if (!code || !type || !value) {
    return NextResponse.json(
      { error: "Missing required fields: code, type, value" },
      { status: 400 },
    );
  }

  if (!Object.values(VoucherType).includes(type)) {
    return NextResponse.json({ error: "Invalid voucher type" }, {
      status: 400,
    });
  }

  // Check if code already exists
  const { data: existing, error: findError } = await tryCatch(
    prisma.voucher.findUnique({
      where: { code },
    }),
  );

  if (findError) {
    return handleError(findError, "create voucher");
  }

  if (existing) {
    return NextResponse.json(
      { error: "Voucher code already exists" },
      { status: 409 },
    );
  }

  // Create voucher
  const { data: voucher, error: createError } = await tryCatch(
    prisma.voucher.create({
      data: {
        code,
        type,
        value,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: VoucherStatus.ACTIVE,
      },
    }),
  );

  if (createError) {
    return handleError(createError, "create voucher");
  }

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
  });
}

export async function DELETE(request: NextRequest) {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    return handleError(sessionError, "delete voucher");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "delete voucher");
  }

  const { searchParams } = new URL(request.url);
  const voucherId = searchParams.get("id");

  if (!voucherId) {
    return NextResponse.json(
      { error: "Voucher ID required" },
      { status: 400 },
    );
  }

  const { error: deleteError } = await tryCatch(
    prisma.voucher.delete({
      where: { id: voucherId },
    }),
  );

  if (deleteError) {
    return handleError(deleteError, "delete voucher");
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { data: session, error: sessionError } = await tryCatch(auth());

  if (sessionError) {
    return handleError(sessionError, "update voucher");
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return handleError(adminError, "update voucher");
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return handleError(parseError, "update voucher");
  }

  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json(
      { error: "Missing required fields: id, status" },
      { status: 400 },
    );
  }

  if (!Object.values(VoucherStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: voucher, error: updateError } = await tryCatch(
    prisma.voucher.update({
      where: { id },
      data: { status },
    }),
  );

  if (updateError) {
    return handleError(updateError, "update voucher");
  }

  return NextResponse.json({
    voucher: {
      id: voucher.id,
      status: voucher.status,
    },
  });
}
