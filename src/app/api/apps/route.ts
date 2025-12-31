import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { appCreationSchema } from "@/lib/validations/app";
import { NextRequest, NextResponse } from "next/server";

import { tryCatch } from "@/lib/try-catch";

export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parseResult = appCreationSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const validatedData = parseResult.data;

  // Build codespace URL if codespaceId is provided
  const codespaceUrl = validatedData.codespaceId
    ? `https://testing.spike.land/live/${validatedData.codespaceId}`
    : undefined;

  const { data: app, error: createError } = await tryCatch(
    prisma.app.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        userId: session.user.id,
        status: "DRAFT",
        codespaceId: validatedData.codespaceId,
        codespaceUrl,
        requirements: {
          create: {
            description: validatedData.requirements,
            priority: "MEDIUM",
            status: "PENDING",
          },
        },
        monetizationModels: {
          create: {
            type: mapMonetizationModelToEnum(validatedData.monetizationModel),
            features: [],
          },
        },
      },
      include: {
        requirements: true,
        monetizationModels: true,
      },
    }),
  );

  if (createError) {
    console.error("Error creating app:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(app, { status: 201 });
}

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: apps, error: fetchError } = await tryCatch(
    prisma.app.findMany({
      where: {
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
      include: {
        requirements: {
          orderBy: {
            createdAt: "asc",
          },
        },
        monetizationModels: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  );

  if (fetchError) {
    console.error("Error fetching apps:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(apps);
}

function mapMonetizationModelToEnum(model: string) {
  const mapping: Record<
    string,
    "FREE" | "FREEMIUM" | "SUBSCRIPTION" | "ONE_TIME" | "USAGE_BASED"
  > = {
    "free": "FREE",
    "freemium": "FREEMIUM",
    "subscription": "SUBSCRIPTION",
    "one-time": "ONE_TIME",
    "usage-based": "USAGE_BASED",
  };
  return mapping[model] || "FREE";
}
