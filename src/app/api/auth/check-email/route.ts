/**
 * Email Check API Route
 *
 * Checks if an email exists in the database and whether the user has a password set.
 * Used for the unified authentication flow to determine the next step.
 *
 * Rate limited to prevent email enumeration attacks.
 */

import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { NextRequest, NextResponse } from "next/server";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Rate limit config: 10 checks per minute per IP (prevent enumeration)
const emailCheckRateLimit = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};

// Maximum request body size
const MAX_BODY_SIZE = 1024;

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIp = forwardedFor.split(",")[0];
    return firstIp ? firstIp.trim() : "unknown";
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a generic identifier
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Check content length to prevent oversized payloads
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    // Rate limiting by IP address (user is not authenticated yet)
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `email_check:${clientIP}`,
      emailCheckRateLimit,
    );

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        },
      );
    }

    const body = await request.json();
    const { email } = body;

    // Input validation: required, string type
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      // User doesn't exist - they can create an account
      return NextResponse.json({
        exists: false,
        hasPassword: false,
      });
    }

    // User exists - check if they have a password set
    return NextResponse.json({
      exists: true,
      hasPassword: user.passwordHash !== null,
    });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 },
    );
  }
}
