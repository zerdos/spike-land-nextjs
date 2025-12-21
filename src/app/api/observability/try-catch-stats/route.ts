/**
 * Try-Catch Stats Sync API
 *
 * Receives batched frontend try-catch events and records them.
 * This endpoint is called by the frontend stats collector.
 */

import { auth } from "@/auth";
import { recordFrontendEvents } from "@/lib/observability/try-catch-stats";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

interface TryCatchEvent {
  success: boolean;
  timestamp?: string;
}

interface RequestBody {
  events: TryCatchEvent[];
}

/**
 * POST /api/observability/try-catch-stats
 *
 * Receives batched frontend events from the client-side collector.
 */
export async function POST(request: Request): Promise<Response> {
  // Get user from session (optional - anonymous if not authenticated)
  const { data: session } = await tryCatch(auth(), { report: false });
  const userId = session?.user?.email || "anonymous";

  // Parse request body
  const { data: body, error: parseError } = await tryCatch<RequestBody>(
    request.json(),
    { report: false },
  );

  if (parseError || !body?.events || !Array.isArray(body.events)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate events array (max 100 events per request)
  const events = body.events.slice(0, 100);

  // Validate each event
  const validEvents = events.filter(
    (event): event is TryCatchEvent =>
      typeof event === "object" &&
      event !== null &&
      typeof event.success === "boolean",
  );

  if (validEvents.length === 0) {
    return NextResponse.json({ error: "No valid events" }, { status: 400 });
  }

  // Record events (non-blocking, buffered)
  recordFrontendEvents(userId, validEvents);

  return NextResponse.json({
    ok: true,
    received: validEvents.length,
  });
}
