/**
 * Admin Feedback API Route
 *
 * List all feedback with filters and update feedback status/adminNote.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { FeedbackStatus, FeedbackType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Validation constants
const CUID_PATTERN = /^c[a-z0-9]{24}$/;
const MAX_ADMIN_NOTE_LENGTH = 2000;

type FeedbackItem = {
  id: string;
  userId: string | null;
  email: string | null;
  type: FeedbackType;
  message: string;
  page: string;
  userAgent: string | null;
  status: FeedbackStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to fetch feedback:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  // Validate status filter
  if (
    status &&
    !Object.values(FeedbackStatus).includes(status as FeedbackStatus)
  ) {
    return NextResponse.json(
      { error: "Invalid status filter" },
      { status: 400 },
    );
  }

  // Validate type filter
  if (type && !Object.values(FeedbackType).includes(type as FeedbackType)) {
    return NextResponse.json(
      { error: "Invalid type filter" },
      { status: 400 },
    );
  }

  // Build where clause
  const where: {
    status?: FeedbackStatus;
    type?: FeedbackType;
  } = {};

  if (status) {
    where.status = status as FeedbackStatus;
  }

  if (type) {
    where.type = type as FeedbackType;
  }

  const { data: feedbackItems, error: fetchError } = await tryCatch(
    prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  );

  if (fetchError) {
    console.error("Failed to fetch feedback:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    feedback: feedbackItems.map((f: FeedbackItem) => ({
      id: f.id,
      userId: f.userId,
      email: f.email,
      type: f.type,
      message: f.message,
      page: f.page,
      userAgent: f.userAgent,
      status: f.status,
      adminNote: f.adminNote,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      user: f.user
        ? {
          id: f.user.id,
          name: f.user.name,
          email: f.user.email,
          image: f.user.image,
        }
        : null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to update feedback:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    console.error("Failed to update feedback:", parseError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const { id, status, adminNote } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Missing required field: id" },
      { status: 400 },
    );
  }

  // Validate id format
  if (!CUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Invalid feedback ID format" },
      { status: 400 },
    );
  }

  // Validate status if provided
  if (status && !Object.values(FeedbackStatus).includes(status)) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 },
    );
  }

  // Validate adminNote length if provided
  if (adminNote && adminNote.length > MAX_ADMIN_NOTE_LENGTH) {
    return NextResponse.json(
      {
        error: `Admin note too long (max ${MAX_ADMIN_NOTE_LENGTH} characters)`,
      },
      { status: 400 },
    );
  }

  // Check if feedback exists
  const { data: existingFeedback, error: findError } = await tryCatch(
    prisma.feedback.findUnique({
      where: { id },
    }),
  );

  if (findError) {
    console.error("Failed to update feedback:", findError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!existingFeedback) {
    return NextResponse.json(
      { error: "Feedback not found" },
      { status: 404 },
    );
  }

  // Build update data
  const updateData: {
    status?: FeedbackStatus;
    adminNote?: string;
  } = {};

  if (status) {
    updateData.status = status;
  }

  if (adminNote !== undefined) {
    updateData.adminNote = adminNote;
  }

  // Update feedback
  const { data: updatedFeedback, error: updateError } = await tryCatch(
    prisma.feedback.update({
      where: { id },
      data: updateData,
    }),
  );

  if (updateError) {
    console.error("Failed to update feedback:", updateError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    feedback: {
      id: updatedFeedback.id,
      status: updatedFeedback.status,
      adminNote: updatedFeedback.adminNote,
      updatedAt: updatedFeedback.updatedAt.toISOString(),
    },
  });
}
