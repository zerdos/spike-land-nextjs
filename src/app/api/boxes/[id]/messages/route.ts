import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxMessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1),
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
    const body = messageSchema.parse(json);

    // Verify box ownership
    const box = await prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!box) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.boxMessage.create({
      data: {
        boxId: id,
        role: BoxMessageRole.USER,
        content: body.content,
      },
    });

    // TODO: Send to agent, get response
    // For now, create a placeholder agent response
    const agentMessage = await prisma.boxMessage.create({
      data: {
        boxId: id,
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
      },
    });

    return NextResponse.json({
      userMessage,
      agentMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.flatten()), { status: 400 });
    }
    console.error("[BOX_MESSAGE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
