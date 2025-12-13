import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BoxStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const box = await prisma.box.findUnique({
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
    });

    if (!box) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(box);
  } catch (error) {
    console.error("[BOX_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const box = await prisma.box.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!box) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Soft delete
    const updatedBox = await prisma.box.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: BoxStatus.TERMINATED,
      },
    });

    return NextResponse.json(updatedBox);
  } catch (error) {
    console.error("[BOX_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
