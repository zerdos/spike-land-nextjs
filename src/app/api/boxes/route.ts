import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const createBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  tierId: z.string().min(1, "Tier ID is required"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const boxes = await prisma.box.findMany({
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
    });

    return NextResponse.json(boxes);
  } catch (error) {
    console.error("[BOXES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const body = createBoxSchema.parse(json);

    // Verify tier exists
    const tier = await prisma.boxTier.findUnique({
      where: { id: body.tierId },
    });

    if (!tier) {
      return new NextResponse("Invalid Tier", { status: 400 });
    }

    // Check user balance and consume tokens
    const cost = tier.pricePerHour; // Charge 1 hour upfront

    // Lazy import to avoid circular dependencies if any
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    const hasBalance = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      cost,
    );
    if (!hasBalance) {
      return new NextResponse("Insufficient Tokens", { status: 402 });
    }

    // TODO: Phase 1 - Mocking the Docker container creation
    // In real implementation, this would trigger a workflow/cloud function
    // For now, we just create the DB record

    // We should ideally wrap this in a transaction, but for Phase 1 separate calls are okay
    // or we can consume AFTER successful creation, but easier to consume first

    const tokenResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: cost,
      source: "box_creation",
      sourceId: "pending", // we don't have box ID yet
      metadata: {
        tierId: tier.id,
        tierName: tier.name,
      },
    });

    if (!tokenResult.success) {
      return new NextResponse("Failed to process payment", { status: 500 });
    }

    let box;
    try {
      box = await prisma.box.create({
        data: {
          name: body.name,
          userId: session.user.id,
          tierId: body.tierId,
          status: BoxStatus.CREATING,
          connectionUrl: null,
        },
      });

      // Create action log
      await prisma.boxAction.create({
        data: {
          boxId: box.id,
          action: "CREATE",
          status: "COMPLETED",
          metadata: { cost },
        },
      });
    } catch (err) {
      // Refund if creation fails
      await TokenBalanceManager.refundTokens(
        session.user.id,
        cost,
        "pending",
        "Box creation failed",
      );
      throw err;
    }

    // Simulate async provisioning (optional, logic would be in a separate worker)
    // For Phase 1, we might just assume it "starts" quickly or stays in CREATING

    return NextResponse.json(box);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[BOXES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
