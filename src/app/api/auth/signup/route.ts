/**
 * User Signup API Route
 *
 * Creates a new user account with email and password.
 * Rate limited to prevent abuse. After signup, the user should
 * sign in using the credentials provider.
 */

import { createStableUserId } from "@/auth.config";
import { ensureUserAlbums } from "@/lib/albums/ensure-user-albums";
import { bootstrapAdminIfNeeded } from "@/lib/auth/bootstrap-admin";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { validateReferralAfterVerification } from "@/lib/referral/fraud-detection";
import { completeReferralAndGrantRewards } from "@/lib/referral/rewards";
import { linkReferralOnSignup } from "@/lib/referral/tracker";
import { tryCatch } from "@/lib/try-catch";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Rate limit config: 5 signups per hour per IP
const signupRateLimit = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// Maximum request body size
const MAX_BODY_SIZE = 2048;

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0];
    return firstIp ? firstIp.trim() : "unknown";
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

async function handleSignup(request: NextRequest): Promise<NextResponse> {
  // Check content length to prevent oversized payloads
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  // Rate limiting by IP address
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(
    `signup:${clientIP}`,
    signupRateLimit,
  );

  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          ),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      },
    );
  }

  const body = await request.json();
  const { email, password } = body;

  // Input validation: email required and must be string
  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }

  // Input validation: password required, must be string, minimum length
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      },
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

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user with stable ID
  const stableId = createStableUserId(trimmedEmail);
  const newUser = await prisma.user.create({
    data: {
      id: stableId,
      email: trimmedEmail,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  // Handle post-signup tasks (same as OAuth signup in auth.ts handleSignIn)
  // Bootstrap admin role for first user
  const { error: bootstrapError } = await tryCatch(
    bootstrapAdminIfNeeded(newUser.id),
  );
  if (bootstrapError) {
    console.error("Failed to bootstrap admin:", bootstrapError);
  }

  // Assign referral code to new user
  const { error: referralCodeError } = await tryCatch(
    assignReferralCodeToUser(newUser.id),
  );
  if (referralCodeError) {
    console.error("Failed to assign referral code:", referralCodeError);
  }

  // Link referral if cookie exists
  const { error: linkReferralError } = await tryCatch(
    linkReferralOnSignup(newUser.id),
  );
  if (linkReferralError) {
    console.error("Failed to link referral on signup:", linkReferralError);
  }

  // Create default private and public albums
  const { error: albumsError } = await tryCatch(ensureUserAlbums(newUser.id));
  if (albumsError) {
    console.error("Failed to create default albums:", albumsError);
  }

  // Process referral rewards (email-based signup = email verified)
  const { data: validation, error: validationError } = await tryCatch(
    validateReferralAfterVerification(newUser.id),
  );
  if (validationError) {
    console.error("Failed to validate referral:", validationError);
  }

  if (validation?.shouldGrantRewards && validation.referralId) {
    const { error: rewardsError } = await tryCatch(
      completeReferralAndGrantRewards(validation.referralId),
    );
    if (rewardsError) {
      console.error("Failed to grant referral rewards:", rewardsError);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Account created successfully",
    user: {
      id: newUser.id,
      email: newUser.email,
    },
  });
}

export async function POST(request: NextRequest) {
  const { data: response, error } = await tryCatch(handleSignup(request));

  if (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }

  return response;
}
