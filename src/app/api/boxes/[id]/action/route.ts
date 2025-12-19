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

  const parseResult = actionSchema.safeParse(json);

  if (!parseResult.success) {
    return new NextResponse(JSON.stringify(parseResult.error.flatten()), { status: 400 });
  }

  const body = parseResult.data;

  const { data: box, error: boxError } = await tryCatch(
    prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    })
  );

  if (boxError) {
    console.error("Database error (box lookup):", boxError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!box) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Log the action
  const { error: actionError } = await tryCatch(
    prisma.boxAction.create({
      data: {
        boxId: id,
        action: body.action,
        status: "PENDING",
      },
    })
  );

  if (actionError) {
    console.error("Database error (create action):", actionError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  // Update box status mock
  // Real implementation would trigger async job
  let newStatus = box.status;
  if (body.action === BoxActionType.START) newStatus = BoxStatus.STARTING;
  if (body.action === BoxActionType.STOP) newStatus = BoxStatus.STOPPING;
  if (body.action === BoxActionType.RESTART) newStatus = BoxStatus.STARTING;

  const { data: updatedBox, error: updateError } = await tryCatch(
    prisma.box.update({
      where: { id: id },
      data: {
        status: newStatus,
      },
    })
  );

  if (updateError) {
    console.error("Database error (update box):", updateError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  return NextResponse.json(updatedBox);
}
