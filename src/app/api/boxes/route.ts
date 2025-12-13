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

    // TODO: Phase 1 - Mocking the Docker container creation
    // In real implementation, this would trigger a workflow/cloud function
    // For now, we just create the DB record

    const box = await prisma.box.create({
      data: {
        name: body.name,
        userId: session.user.id,
        tierId: body.tierId,
        status: BoxStatus.CREATING,
        // Mock connection URL for now or leave null until "ready"
        connectionUrl: null,
      },
    });

    // Simulate async provisioning (optional, logic would be in a separate worker)
    // For Phase 1, we might just assume it "starts" quickly or stays in CREATING

    return NextResponse.json(box);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    console.error("[BOXES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
