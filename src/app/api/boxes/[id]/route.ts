import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { tryCatch } from "@/lib/try-catch";

export async function GET(
  _req: Request,
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

  const { data: box, error: boxError } = await tryCatch(
    prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        tier: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })
  );

  if (boxError) {
    console.error("[BOX_GET]", boxError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!box) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(box);
}

export async function DELETE(
  _req: Request,
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

  const { data: box, error: boxError } = await tryCatch(
    prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    })
  );

  if (boxError) {
    console.error("[BOX_DELETE] findUnique error:", boxError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  if (!box) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Soft delete
  const { data: updatedBox, error: updateError } = await tryCatch(
    prisma.box.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: BoxStatus.TERMINATED,
      },
    })
  );

  if (updateError) {
    console.error("[BOX_DELETE] update error:", updateError);
    return new NextResponse("Internal Error", { status: 500 });
  }

  return NextResponse.json(updatedBox);
}
