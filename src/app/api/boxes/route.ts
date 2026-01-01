import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const createBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  tierId: z.string().min(1, "Tier ID is required"),
});

import { tryCatch } from "@/lib/try-catch";

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: boxes, error: boxesError } = await tryCatch(
    prisma.box.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        tier: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  );

  if (boxesError) {
    console.error("[BOXES_GET]", boxesError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  return NextResponse.json(boxes);
}

export async function POST(req: Request) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: json, error: jsonError } = await tryCatch(req.json());
  if (jsonError) {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parseResult = createBoxSchema.safeParse(json);

  if (!parseResult.success) {
    return new NextResponse(JSON.stringify(parseResult.error.flatten()), {
      status: 400,
    });
  }

  const body = parseResult.data;

  // Verify tier exists
  const { data: tier, error: tierError } = await tryCatch(
    prisma.boxTier.findUnique({
      where: { id: body.tierId },
    }),
  );

  if (tierError) {
    console.error("Database error (tier lookup):", tierError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!tier) {
    return new NextResponse("Invalid Tier", { status: 400 });
  }

  // Check user balance and consume tokens
  const cost = tier.pricePerHour; // Charge 1 hour upfront

  // Lazy import to avoid circular dependencies if any
  const { TokenBalanceManager } = await import(
    "@/lib/tokens/balance-manager"
  );

  const { data: hasBalance, error: balanceError } = await tryCatch(
    TokenBalanceManager.hasEnoughTokens(session.user.id, cost),
  );

  if (balanceError) {
    console.error("Token balance check error:", balanceError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!hasBalance) {
    return new NextResponse("Insufficient Tokens", { status: 402 });
  }

  // Phase 1 Implementation Note:
  // Container provisioning is handled asynchronously. The box is created with status CREATING,
  // and a background worker (or cloud function) would provision the actual container.
  // For Phase 1, the database record serves as the source of truth while container
  // orchestration infrastructure is being developed.

  // We should ideally wrap this in a transaction, but for Phase 1 separate calls are okay
  // or we can consume AFTER successful creation, but easier to consume first

  const { data: tokenResult, error: tokenError } = await tryCatch(
    TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: cost,
      source: "box_creation",
      sourceId: "pending", // we don't have box ID yet
      metadata: {
        tierId: tier.id,
        tierName: tier.name,
      },
    }),
  );

  if (tokenError || !tokenResult?.success) {
    console.error("Token consumption error:", tokenError);
    return new NextResponse("Failed to process payment", { status: 500 });
  }

  const { data: box, error: createError } = await tryCatch(
    prisma.box.create({
      data: {
        name: body.name,
        userId: session.user.id,
        tierId: body.tierId,
        status: BoxStatus.CREATING,
        connectionUrl: null,
      },
    }),
  );

  if (createError) {
    // Refund if creation fails
    await tryCatch(
      TokenBalanceManager.refundTokens(
        session.user.id,
        cost,
        "pending",
        "Box creation failed",
      ),
    );
    console.error("Box creation failed:", createError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  // Create action log
  const { error: actionError } = await tryCatch(
    prisma.boxAction.create({
      data: {
        boxId: box.id,
        action: "CREATE",
        status: "COMPLETED",
        metadata: { cost },
      },
    }),
  );

  if (actionError) {
    console.error("Failed to log box action:", actionError);
    // Non-fatal error
  }

  // Simulate async provisioning (optional, logic would be in a separate worker)
  // For Phase 1, we might just assume it "starts" quickly or stays in CREATING

  return NextResponse.json(box);
}
