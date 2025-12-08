/**
 * Admin Feedback API Route
 *
 * List all feedback with filters and update feedback status/adminNote.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { FeedbackStatus, FeedbackType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Validation constants
const CUID_PATTERN = /^c[a-z0-9]{24}$/;
const MAX_ADMIN_NOTE_LENGTH = 2000;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Validate status filter
    if (status && !Object.values(FeedbackStatus).includes(status as FeedbackStatus)) {
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

    const feedbackItems = await prisma.feedback.findMany({
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
    });

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
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
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
        { error: `Admin note too long (max ${MAX_ADMIN_NOTE_LENGTH} characters)` },
        { status: 400 },
      );
    }

    // Check if feedback exists
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id },
    });

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
    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      feedback: {
        id: updatedFeedback.id,
        status: updatedFeedback.status,
        adminNote: updatedFeedback.adminNote,
        updatedAt: updatedFeedback.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to update feedback:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
