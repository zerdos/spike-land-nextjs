/**
 * POST /api/errors/report
 *
 * Receives error reports from frontend and stores them in the database.
 * Rate limited to prevent abuse.
 */

import { reportErrorsBatchToDatabase } from "@/lib/errors/error-reporter.server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface ErrorReport {
  message: string;
  stack?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  callerName?: string;
  errorType?: string;
  errorCode?: string;
  route?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  environment?: "FRONTEND" | "BACKEND";
}

interface RequestBody {
  errors: ErrorReport[];
}

// Max errors per request to prevent abuse
const MAX_ERRORS_PER_REQUEST = 20;

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 20 requests per minute per IP
    const { isLimited, remaining } = await checkRateLimit(
      `error-report:${ip}`,
      { maxRequests: 20, windowMs: 60000 },
    );

    if (isLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": remaining.toString() },
        },
      );
    }

    // Parse request body
    const body: RequestBody = await request.json();

    if (!body.errors || !Array.isArray(body.errors)) {
      return NextResponse.json(
        { error: "Invalid request body: errors array required" },
        { status: 400 },
      );
    }

    // Limit errors per request
    const errorsToProcess = body.errors.slice(0, MAX_ERRORS_PER_REQUEST);
    let failCount = 0;

    // Validate and sanitize all errors first
    const validErrors: Array<{
      error: {
        message: string;
        stack?: string;
        sourceFile?: string;
        sourceLine?: number;
        sourceColumn?: number;
        callerName?: string;
        errorType?: string;
        errorCode?: string;
        route?: string;
        userId?: string;
        metadata?: Record<string, unknown>;
        timestamp: string;
      };
      environment: "FRONTEND" | "BACKEND";
    }> = [];

    for (const error of errorsToProcess) {
      // Validate required fields
      if (!error.message || typeof error.message !== "string") {
        failCount++;
        continue;
      }

      const env: "FRONTEND" | "BACKEND" = error.environment === "BACKEND"
        ? "BACKEND"
        : "FRONTEND";

      validErrors.push({
        error: {
          message: error.message.slice(0, 10000),
          stack: error.stack?.slice(0, 50000),
          sourceFile: error.sourceFile?.slice(0, 500),
          sourceLine: typeof error.sourceLine === "number"
            ? error.sourceLine
            : undefined,
          sourceColumn: typeof error.sourceColumn === "number"
            ? error.sourceColumn
            : undefined,
          callerName: error.callerName?.slice(0, 200),
          errorType: error.errorType?.slice(0, 100),
          errorCode: error.errorCode?.slice(0, 100),
          route: error.route?.slice(0, 500),
          userId: error.userId?.slice(0, 100),
          metadata: typeof error.metadata === "object"
            ? error.metadata
            : undefined,
          timestamp: error.timestamp || new Date().toISOString(),
        },
        environment: env,
      });
    }

    // Batch insert all valid errors in a single query
    let successCount = 0;
    try {
      await reportErrorsBatchToDatabase(validErrors);
      successCount = validErrors.length;
    } catch (dbError) {
      failCount += validErrors.length;
      console.warn(
        "[ErrorReport API] Database write failed:",
        dbError instanceof Error ? dbError.message : dbError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        received: successCount,
        failed: failCount,
        truncated: body.errors.length > MAX_ERRORS_PER_REQUEST,
      },
      {
        headers: { "X-RateLimit-Remaining": remaining.toString() },
      },
    );
  } catch (error) {
    console.error("[ErrorReport API] Failed to process request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
