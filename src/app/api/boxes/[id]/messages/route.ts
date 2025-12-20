import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxMessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1),
});

import { tryCatch } from "@/lib/try-catch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: paramsData, error: paramsError } = await tryCatch(params);
  if (paramsError) {
    return new NextResponse("Invalid parameters", { status: 400 });
  }
  const { id } = paramsData;

  const { data: json, error: jsonError } = await tryCatch(req.json());
  if (jsonError) {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parseResult = messageSchema.safeParse(json);

  if (!parseResult.success) {
    return new NextResponse(JSON.stringify(parseResult.error.flatten()), { status: 400 });
  }

  const body = parseResult.data;

  // Verify box ownership
  const { data: box, error: boxError } = await tryCatch(
    prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    }),
  );

  if (boxError) {
    console.error("Database error (box lookup):", boxError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!box) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Save user message
  const { data: userMessage, error: userMessageError } = await tryCatch(
    prisma.boxMessage.create({
      data: {
        boxId: id,
        role: BoxMessageRole.USER,
        content: body.content,
      },
    }),
  );

  if (userMessageError) {
    console.error("Failed to save user message:", userMessageError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  // TODO: Send to agent, get response
  // For now, create a placeholder agent response
  const { data: agentMessage, error: agentMessageError } = await tryCatch(
    prisma.boxMessage.create({
      data: {
        boxId: id,
        role: BoxMessageRole.AGENT,
        content: "Message received. This is a placeholder response.",
      },
    }),
  );

  if (agentMessageError) {
    console.error("Failed to save agent message:", agentMessageError);
    // Don't fail the request if agent message fails? Or maybe fail
    // Returning success with userMessage but no agentMessage might be weird.
    return new NextResponse("Internal Error", { status: 500 });
  }

  return NextResponse.json({
    userMessage,
    agentMessage,
  });
}
