import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxActionType, BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum([
    BoxActionType.START,
    BoxActionType.STOP,
    BoxActionType.RESTART,
  ]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await req.json();
    const body = actionSchema.parse(json);

    const box = await prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!box) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Log the action
    await prisma.boxAction.create({
      data: {
        boxId: id,
        action: body.action,
        status: "PENDING",
      },
    });

    // Update box status mock
    // Real implementation would trigger async job
    let newStatus = box.status;
    if (body.action === BoxActionType.START) newStatus = BoxStatus.STARTING;
    if (body.action === BoxActionType.STOP) newStatus = BoxStatus.STOPPING;
    if (body.action === BoxActionType.RESTART) newStatus = BoxStatus.STARTING;

    const updatedBox = await prisma.box.update({
      where: { id: id },
      data: {
        status: newStatus,
      },
    });

    return NextResponse.json(updatedBox);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[BOX_ACTION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
