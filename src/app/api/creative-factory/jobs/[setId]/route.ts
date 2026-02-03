import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

import logger from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string; }>; },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { setId } = await params;

  try {
    const set = await prisma.creativeSet.findUnique({
      where: { id: setId },
      include: {
        variants: {
          orderBy: { variantNumber: "asc" },
        },
      },
    });

    if (!set) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (set.generatedById !== session.user.id) {
      // Optional: Check workspace access instead if shared
      // For now, strict user ownership check
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(set);
  } catch (error) {
    logger.error("Job status error:", { error });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
