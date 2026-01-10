/**
 * Session Tracking API Route
 *
 * Creates or updates visitor sessions for campaign analytics.
 * Public endpoint - no authentication required.
 * Rate limited to prevent abuse.
 */

import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Rate limit config: 100 requests per minute per IP
const sessionTrackingRateLimit = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

// Maximum request body size (4KB should be plenty)
const MAX_BODY_SIZE = 4096;

// Input validation schema
const sessionRequestSchema = z.object({
  visitorId: z.string().min(1).max(128),
  landingPage: z.string().min(1).max(2048),
  referrer: z.string().max(2048).optional(),
  deviceType: z.string().max(50).optional(),
  browser: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
});

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

export async function POST(request: NextRequest) {
  // Check content length to prevent oversized payloads
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  // Rate limiting by IP address
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(
    `tracking_session:${clientIP}`,
    sessionTrackingRateLimit,
  );

  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
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

  // Parse and validate request body
  const { data: body, error: jsonError } = await tryCatch<unknown>(
    request.json(),
  );

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = sessionRequestSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      {
        error: `Invalid input: ${firstError?.path.join(".")} - ${firstError?.message}`,
      },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  // Check for existing active session for this visitorId (within last 30 minutes)
  const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT_MS);

  const { data: existingSession, error: findError } = await tryCatch(
    prisma.visitorSession.findFirst({
      where: {
        visitorId: data.visitorId,
        sessionStart: {
          gte: cutoffTime,
        },
        // Session should not have ended yet, or ended recently
        OR: [{ sessionEnd: null }, { sessionEnd: { gte: cutoffTime } }],
      },
      orderBy: {
        sessionStart: "desc",
      },
    }),
  );

  if (findError) {
    console.error("[Tracking] Session tracking error:", findError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (existingSession) {
    // Update existing session with new page view count and exit page
    const { data: updatedSession, error: updateError } = await tryCatch(
      prisma.visitorSession.update({
        where: { id: existingSession.id },
        data: {
          pageViewCount: existingSession.pageViewCount + 1,
          exitPage: data.landingPage, // The "landing page" of this request becomes the current exit page
          sessionEnd: new Date(), // Update session activity timestamp
        },
      }),
    );

    if (updateError) {
      console.error("[Tracking] Session tracking error:", updateError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    console.log(
      `[Tracking] Updated session ${updatedSession.id} for visitor ${data.visitorId}`,
    );

    return NextResponse.json(
      { sessionId: updatedSession.id },
      { status: 200 },
    );
  }

  // Create new session
  const { data: newSession, error: createError } = await tryCatch(
    prisma.visitorSession.create({
      data: {
        visitorId: data.visitorId,
        landingPage: data.landingPage,
        exitPage: data.landingPage, // Initially, landing page is also exit page
        pageViewCount: 1,
        referrer: data.referrer || null,
        deviceType: data.deviceType || null,
        browser: data.browser || null,
        os: data.os || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
        gclid: data.gclid || null,
        fbclid: data.fbclid || null,
      },
    }),
  );

  if (createError) {
    console.error("[Tracking] Session tracking error:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  console.log(
    `[Tracking] Created new session ${newSession.id} for visitor ${data.visitorId}`,
  );

  return NextResponse.json({ sessionId: newSession.id }, { status: 201 });
}

// PATCH request validation schema
const patchRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  sessionEnd: z.string().optional(),
  userId: z.string().min(1).max(128).optional(),
  exitPage: z.string().max(2048).optional(),
});

/**
 * PATCH /api/tracking/session - Update session (end time, link to user)
 */
export async function PATCH(request: NextRequest) {
  // Check content length
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  // Rate limiting by IP
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(
    `tracking_session_patch:${clientIP}`,
    sessionTrackingRateLimit,
  );

  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      { error: "Too many requests" },
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

  // Parse body
  const { data: body, error: jsonError } = await tryCatch<unknown>(
    request.json(),
  );

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = patchRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, sessionEnd, userId, exitPage } = parseResult.data;

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (sessionEnd) {
    updateData.sessionEnd = new Date(sessionEnd);
  }
  if (userId) {
    updateData.userId = userId;
  }
  if (exitPage) {
    updateData.exitPage = exitPage;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No update fields provided" },
      { status: 400 },
    );
  }

  // Update session
  const { data: updatedSession, error: updateError } = await tryCatch(
    prisma.visitorSession.update({
      where: { id: sessionId },
      data: updateData,
    }),
  );

  if (updateError) {
    // Handle not found error
    if (
      updateError instanceof Error &&
      updateError.message.includes("Record to update not found")
    ) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.error("[Tracking] Session patch error:", updateError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ sessionId: updatedSession.id });
}
