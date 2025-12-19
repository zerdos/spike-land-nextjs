import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { appCreationSchema } from "@/lib/validations/app";
import type { MonetizationType, RequirementPriority, RequirementStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { tryCatch } from "@/lib/try-catch";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = params;

  const { data: app, error: fetchError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id,
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
    })
  );

  if (fetchError) {
    console.error("Error fetching app:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!app) {
    return NextResponse.json(
      { error: "App not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(app);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = params;

  const { data: existingApp, error: fetchError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
    })
  );

  if (fetchError) {
    console.error("Error fetching app for update:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!existingApp) {
    return NextResponse.json(
      { error: "App not found" },
      { status: 404 },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = appCreationSchema.partial().safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error", details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const validatedData = parseResult.data;

  const updateData: {
    name?: string;
    description?: string;
    requirements?: {
      create: {
        description: string;
        priority: RequirementPriority;
        status: RequirementStatus;
      };
    };
    monetizationModels?: {
      create: { type: MonetizationType; features: string[]; };
    };
  } = {};

  if (validatedData.name !== undefined) {
    updateData.name = validatedData.name;
  }
  if (validatedData.description !== undefined) {
    updateData.description = validatedData.description;
  }

  const { data: app, error: updateError } = await tryCatch(
    prisma.app.update({
      where: { id },
      data: updateData,
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
    })
  );

  if (updateError) {
    console.error("Error updating app:", updateError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(app);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);
  if (paramsError) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const { id } = params;

  const { data: existingApp, error: fetchError } = await tryCatch(
    prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
    })
  );

  if (fetchError) {
    console.error("Error fetching app for deletion:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!existingApp) {
    return NextResponse.json(
      { error: "App not found" },
      { status: 404 },
    );
  }

  const { error: deleteError } = await tryCatch(
    prisma.app.update({
      where: { id },
      data: { status: "DELETED" },
    })
  );

  if (deleteError) {
    console.error("Error deleting app:", deleteError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
