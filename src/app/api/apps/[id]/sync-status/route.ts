import { auth } from "@/auth";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { broadcastSyncInProgress } from "../messages/stream/route";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; }>; },
) {
  const { data: session, error: authError } = await tryCatch(auth());

  // For internal API calls, we check either user auth OR internal API key
  const apiKey = request.headers.get("x-internal-api-key");
  const isInternalCall = apiKey === process.env["INTERNAL_API_KEY"];

  if (!isInternalCall && (authError || !session?.user?.id)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: params, error: paramsError } = await tryCatch(context.params);

  if (paramsError || !params) {
    return new Response(JSON.stringify({ error: "Invalid parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = params;

  const body = await request.json();
  const { isSyncing } = body;

  // Broadcast to connected clients
  broadcastSyncInProgress(id, isSyncing);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
