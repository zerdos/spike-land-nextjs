import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VALID_FEEDBACK_TYPES = ["BUG", "IDEA", "OTHER"] as const;

type FeedbackType = typeof VALID_FEEDBACK_TYPES[number];

interface FeedbackRequestBody {
  type: string;
  message: string;
  email?: string;
  page: string;
  userAgent?: string;
}

function isValidFeedbackType(type: string): type is FeedbackType {
  return VALID_FEEDBACK_TYPES.includes(type as FeedbackType);
}

export async function POST(request: NextRequest) {
  // Parse request body
  const { data: body, error: parseError } = await tryCatch<FeedbackRequestBody>(
    request.json(),
  );

  if (parseError) {
    console.error("Error parsing request body:", parseError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Validate required fields
  if (!body.type || !isValidFeedbackType(body.type)) {
    return NextResponse.json(
      { error: "Invalid feedback type. Must be one of: BUG, IDEA, OTHER" },
      { status: 400 },
    );
  }

  if (!body.message || body.message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required and cannot be empty" },
      { status: 400 },
    );
  }

  if (!body.page || body.page.trim().length === 0) {
    return NextResponse.json(
      { error: "Page is required and cannot be empty" },
      { status: 400 },
    );
  }

  // Get session (optional - feedback can be anonymous)
  const { data: session } = await tryCatch(auth());
  const userId = session?.user?.id || null;

  // Create feedback record
  const { data: feedback, error: createError } = await tryCatch(
    prisma.feedback.create({
      data: {
        type: body.type as FeedbackType,
        message: body.message.trim(),
        page: body.page.trim(),
        userId,
        email: body.email?.trim() || null,
        userAgent: body.userAgent?.trim() || null,
      },
    }),
  );

  if (createError) {
    console.error("Error creating feedback:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, id: feedback.id },
    { status: 201 },
  );
}
