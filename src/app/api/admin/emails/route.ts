/**
 * Email Logs Admin API Route
 *
 * List, search, and view email logs. Send test emails.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { sendEmail } from "@/lib/email/client";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { EmailStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const MAX_SEARCH_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function handleGetEmailLogs(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id)
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status") as EmailStatus | null;
  const template = searchParams.get("template");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
    ),
  );

  // Validate search query length
  if (search && search.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json(
      {
        error: `Search query too long (max ${MAX_SEARCH_LENGTH} characters)`,
      },
      { status: 400 },
    );
  }

  // Validate status enum
  if (status && !Object.values(EmailStatus).includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { to: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (template) {
    where.template = template;
  }

  // Get total count for pagination
  const total = await prisma.emailLog.count({ where });

  // Get emails with pagination
  const emails = await prisma.emailLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { sentAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Get unique templates for filter dropdown
  const templates = await prisma.emailLog.groupBy({
    by: ["template"],
    _count: true,
  });

  return NextResponse.json({
    emails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    templates: templates.map((t) => t.template),
  });
}

export async function GET(request: NextRequest) {
  const { data: response, error } = await tryCatch(handleGetEmailLogs(request));

  if (error) {
    console.error("Email logs fetch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 },
    );
  }

  return response;
}

async function handlePostEmailAction(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id)
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "sendTestEmail") {
    const { to } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    // Send test welcome email
    const result = await sendEmail({
      to,
      subject: "Test Email from Spike Land",
      react: WelcomeEmail({
        userName: "Test User",
        userEmail: to,
      }),
    });

    if (result.success) {
      // Log the email
      await prisma.emailLog.create({
        data: {
          userId: session.user.id,
          to,
          subject: "Test Email from Spike Land",
          template: "TEST",
          status: EmailStatus.SENT,
          resendId: result.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        emailId: result.id,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid action" },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  const { data: response, error } = await tryCatch(
    handlePostEmailAction(request),
  );

  if (error) {
    console.error("Email action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to perform email action" },
      { status: 500 },
    );
  }

  return response;
}
