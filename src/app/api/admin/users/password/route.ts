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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    // Rate limit password set operations (5 per hour per admin)
    const rateLimitResult = await checkRateLimit(`password-set:${session.user.id}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (rateLimitResult.isLimited) {
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

    const body = await request.json();
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
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (existingUser) {
      // Update existing user's password
      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });

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
      const newUser = await prisma.user.create({
        data: {
          id: stableId,
          email,
          name: name || null,
          passwordHash,
        },
        select: { id: true, email: true, name: true },
      });

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
      { error: "User not found. Set createIfNotExists: true to create a new user" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Failed to set user password:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
