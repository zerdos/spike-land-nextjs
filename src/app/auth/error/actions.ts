"use server";

import { logger } from "@/lib/errors/structured-logger";
import { headers } from "next/headers";

/**
 * Server action to log authentication errors.
 * Called from the client-side error page to capture error details.
 */
export async function logAuthError(errorCode: string | null): Promise<void> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "unknown";
  const referer = headersList.get("referer") || "unknown";

  logger.error("Auth error displayed to user", undefined, {
    errorCode: errorCode || "unknown",
    route: "/auth/error",
    userAgent,
    referer,
  });
}
