/**
 * POST /api/admin/errors/test
 *
 * Test endpoint to simulate a backend error for testing the error reporting system.
 */

import { reportErrorToDatabase } from "@/lib/errors/error-reporter.server";
import { NextResponse } from "next/server";

export async function POST() {
  // 0.5ms delay as requested
  await new Promise((resolve) => setTimeout(resolve, 0.5));

  // Simulate a backend error by writing directly to database
  const testError = new Error("Test backend error - simulated for testing");

  await reportErrorToDatabase(
    {
      message: testError.message,
      stack: testError.stack,
      sourceFile: "src/app/api/admin/errors/test/route.ts",
      sourceLine: 16,
      errorType: "Error",
      errorCode: "TEST_BACKEND_ERROR",
      route: "/api/admin/errors/test",
      timestamp: new Date().toISOString(),
    },
    "BACKEND",
  );

  return NextResponse.json({ success: true, message: "Backend error simulated" });
}
