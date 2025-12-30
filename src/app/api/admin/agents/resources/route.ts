/**
 * Admin Agents Resources API
 *
 * GET - Get status of development resources
 */

import { auth } from "@/auth";
import { detectResources } from "@/lib/agents/resource-detector";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/agents/resources
 * Get status of development resources (dev server, MCP servers, database, etc.)
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: resources, error: detectError } = await tryCatch(
    detectResources(),
  );

  if (detectError) {
    console.error("Failed to detect resources:", detectError);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }

  return NextResponse.json({
    resources,
    checkedAt: new Date().toISOString(),
  });
}
