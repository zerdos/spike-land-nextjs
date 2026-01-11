import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: test, error } = await tryCatch(
    prisma.abTest.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          include: {
            results: true,
          },
        },
      },
    })
  );

  if (error) {
    console.error(`Error fetching A/B test ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch A/B test" },
      { status: 500 }
    );
  }

  if (!test) {
    return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
  }

  return NextResponse.json({ test });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error(`Error updating A/B test ${params.id}:`, bodyError);
    return NextResponse.json(
      { error: "Failed to update A/B test" },
      { status: 500 }
    );
  }

  const { name, description, status, winnerVariantId } = body;

  const { data: test, error: updateError } = await tryCatch(
    prisma.abTest.update({
      where: { id: params.id },
      data: {
        name,
        description,
        status,
        winnerVariantId,
      },
      include: {
        variants: true,
      },
    })
  );

  if (updateError) {
    console.error(`Error updating A/B test ${params.id}:`, updateError);
    return NextResponse.json(
      { error: "Failed to update A/B test" },
      { status: 500 }
    );
  }

  return NextResponse.json({ test });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await tryCatch(
    prisma.abTest.delete({
      where: { id: params.id },
    })
  );

  if (error) {
    console.error(`Error deleting A/B test ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete A/B test" },
      { status: 500 }
    );
  }

  return new Response(null, { status: 204 });
}
