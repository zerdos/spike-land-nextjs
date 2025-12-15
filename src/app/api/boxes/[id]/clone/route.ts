import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const cloneBoxSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long")
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const body = cloneBoxSchema.parse(json);
    const { id: boxId } = await params;

    // Fetch source box
    const sourceBox = await prisma.box.findUnique({
      where: { id: boxId },
      include: { tier: true },
    });

    if (!sourceBox || sourceBox.userId !== session.user.id) {
      return new NextResponse("Box not found", { status: 404 });
    }

    if (!sourceBox.tier) {
      return new NextResponse("Box tier not found", { status: 500 });
    }

    if (sourceBox.deletedAt) {
      return new NextResponse("Cannot clone deleted box", { status: 400 });
    }

    // Lazy import TokenBalanceManager
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    // Cost: Same as new box creation (1 hour of tier price)
    const cost = sourceBox.tier.pricePerHour;

    const hasBalance = await TokenBalanceManager.hasEnoughTokens(
      session.user.id,
      cost,
    );
    if (!hasBalance) {
      return new NextResponse("Insufficient Tokens", { status: 402 });
    }

    // Consume tokens
    const tokenResult = await TokenBalanceManager.consumeTokens({
      userId: session.user.id,
      amount: cost,
      source: "box_clone",
      sourceId: sourceBox.id,
      metadata: {
        sourceBoxId: sourceBox.id,
        tierId: sourceBox.tierId,
      },
    });

    if (!tokenResult.success) {
      return new NextResponse("Failed to process payment", { status: 500 });
    }

    let clonedBox;
    try {
      const newName = body.name || `Clone of ${sourceBox.name}`;

      clonedBox = await prisma.box.create({
        data: {
          name: newName,
          userId: session.user.id,
          tierId: sourceBox.tierId, // Same tier
          status: BoxStatus.CREATING,
          connectionUrl: null, // New instance
          // storageVolumeId: sourceBox.storageVolumeId // In real implementation, we'd snapshot the volume first
        },
      });

      // Log action on NEW box
      await prisma.boxAction.create({
        data: {
          boxId: clonedBox.id,
          action: "CREATE",
          status: "COMPLETED",
          metadata: {
            sourceBoxId: sourceBox.id,
            type: "CLONE",
            cost,
          },
        },
      });

      // Log action on OLD box (optional, maybe "CLONED" action type?)
      await prisma.boxAction.create({
        data: {
          boxId: sourceBox.id,
          action: "CLONE", // Need to ensure this enum value exists
          status: "COMPLETED",
          metadata: {
            newBoxId: clonedBox.id,
          },
        },
      });
    } catch (err) {
      await TokenBalanceManager.refundTokens(
        session.user.id,
        cost,
        sourceBox.id,
        "Box clone failed",
      );
      throw err;
    }

    return NextResponse.json(clonedBox);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[BOX_CLONE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
