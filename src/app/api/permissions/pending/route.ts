/**
 * GET /api/permissions/pending
 *
 * List pending permission requests for the authenticated user.
 */

import { authenticateMcpOrSession } from "@/lib/mcp/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await authenticateMcpOrSession(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json(
      { error: authResult.error ?? "Authentication required" },
      { status: 401 },
    );
  }

  const prisma = (await import("@/lib/prisma")).default;

  const requests = await prisma.permissionRequest.findMany({
    where: {
      userId: authResult.userId,
      status: "PENDING",
    },
    select: {
      id: true,
      agentId: true,
      requestType: true,
      requestPayload: true,
      status: true,
      fallbackBehavior: true,
      templateId: true,
      expiresAt: true,
      createdAt: true,
      agent: {
        select: { displayName: true },
      },
      template: {
        select: { name: true, displayName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests });
}
