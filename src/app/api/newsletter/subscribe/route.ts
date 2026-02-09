import { getResend } from "@/lib/email/client";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limiter";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIP = forwarded.split(",")[0];
    if (firstIP) {
      return firstIP.trim();
    }
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { email } = body as { email?: string };

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(
    `newsletter-subscribe:${clientIP}`,
    rateLimitConfigs.newsletterSubscribe,
  );

  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { error: dbError } = await tryCatch(
    prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: "footer" },
      update: { unsubscribed: false, unsubscribedAt: null },
    }),
  );

  if (dbError) {
    console.error("Newsletter subscribe error:", dbError);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 },
    );
  }

  // Optionally sync to Resend contacts — don't block on failure
  const { error: resendError } = await tryCatch(
    (async () => {
      const resend = getResend();
      await resend.contacts.create({
        email,
        audienceId: process.env["RESEND_AUDIENCE_ID"] || "",
      });
    })(),
  );

  if (resendError) {
    console.warn("Failed to sync subscriber to Resend:", resendError);
  }

  return NextResponse.json({ success: true });
}
