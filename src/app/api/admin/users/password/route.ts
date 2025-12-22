/**
 * User Password Management API Route
 *
 * Allows admins to set or create users with passwords for testing purposes.
 * This is primarily used for e2e testing scenarios.
 */

import { auth } from "@/auth";
import { createStableUserId } from "@/auth.config";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { tryCatch } from "@/lib/try-catch";

export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  // Rate limit password set operations (5 per hour per admin)
  const { data: rateLimitResult, error: rateLimitError } = await tryCatch(
    checkRateLimit(
      `password-set:${session.user.id}`,
      {
        maxRequests: 5,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
    ),
  );

  if (rateLimitError) {
    console.error("Rate limit check error:", rateLimitError);
    // Fail open or closed? Closed seems safer for admin actions
    return NextResponse.json(
      { error: "Rate limit check failed" },
      { status: 500 },
    );
  }

  if (rateLimitResult?.isLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, name, createIfNotExists } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing required fields: email, password" },
      { status: 400 },
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 },
    );
  }

  // NOTE: Minimal password validation - this endpoint is for test/demo purposes only.
  // In production, use OAuth providers for authentication.
  // Any non-empty password is allowed for testing flexibility.
  if (typeof password !== "string" || password.length < 1) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 },
    );
  }

  // Hash the password
  const { data: passwordHash, error: hashError } = await tryCatch(
    bcrypt.hash(password, 12),
  );

  if (hashError) {
    console.error("Password hash error:", hashError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Check if user exists
  const { data: existingUser, error: fetchError } = await tryCatch(
    prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    }),
  );

  if (fetchError) {
    console.error("User lookup error:", fetchError);
    if (fetchError instanceof Error && fetchError.message.includes("Forbidden")) {
      return NextResponse.json({ error: fetchError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (existingUser) {
    // Update existing user's password
    const { error: updateError } = await tryCatch(
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
    );

    if (updateError) {
      console.error("User update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated for existing user",
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      },
    });
  }

  // Create new user if requested
  if (createIfNotExists) {
    const stableId = createStableUserId(email);
    const { data: newUser, error: createError } = await tryCatch(
      prisma.user.create({
        data: {
          id: stableId,
          email,
          name: name || null,
          passwordHash,
        },
        select: { id: true, email: true, name: true },
      }),
    );

    if (createError) {
      console.error("User creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "User created with password",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  }

  return NextResponse.json(
    {
      error: "User not found. Set createIfNotExists: true to create a new user",
    },
    { status: 404 },
  );
}
