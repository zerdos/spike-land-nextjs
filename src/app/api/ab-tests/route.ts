import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tests, error } = await tryCatch(
    prisma.abTest.findMany({
      include: {
        variants: true,
      },
    }),
  );

  if (error) {
    console.error("Error listing A/B tests:", error);
    return NextResponse.json(
      { error: "Failed to list A/B tests" },
      { status: 500 },
    );
  }

  return NextResponse.json({ tests });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Error creating A/B test:", bodyError);
    return NextResponse.json(
      { error: "Failed to create A/B test" },
      { status: 500 },
    );
  }

  const { name, description, variants } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Test name is required" },
      { status: 400 },
    );
  }

  if (!variants || !Array.isArray(variants) || variants.length < 2) {
    return NextResponse.json(
      { error: "At least two variants are required" },
      { status: 400 },
    );
  }

  const totalSplit = variants.reduce(
    (sum, v) => sum + v.splitPercentage,
    0,
  );

  if (totalSplit !== 100) {
    return NextResponse.json(
      { error: "Total split percentage must be 100" },
      { status: 400 },
    );
  }

  const { data: test, error: createError } = await tryCatch(
    prisma.abTest.create({
      data: {
        name,
        description,
        variants: {
          create: variants.map((variant) => ({
            name: variant.name,
            splitPercentage: variant.splitPercentage,
          })),
        },
      },
      include: {
        variants: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating A/B test:", createError);
    return NextResponse.json(
      { error: "Failed to create A/B test" },
      { status: 500 },
    );
  }

  return NextResponse.json({ test }, { status: 201 });
}
