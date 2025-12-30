import { auth } from "@/auth";
import { TierManager } from "@/lib/tokens/tier-manager";
import { tryCatch } from "@/lib/try-catch";
import { SubscriptionTier } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_SIZE = 10 * 1024;

interface DowngradeRequest {
  targetTier: keyof typeof SubscriptionTier;
}

/**
 * POST /api/tiers/downgrade
 * Schedule tier downgrade for next billing cycle
 */
export async function POST(request: NextRequest) {
  // Check content length
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Auth error:", authError);
    return NextResponse.json({ error: "Authentication failed" }, {
      status: 500,
    });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch<DowngradeRequest>(
    request.json(),
  );

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { targetTier } = body;

  if (!targetTier || !SubscriptionTier[targetTier]) {
    return NextResponse.json({ error: "Invalid target tier" }, { status: 400 });
  }

  const targetTierEnum = SubscriptionTier[targetTier];

  const { data: result, error } = await tryCatch(
    TierManager.scheduleDowngrade(session.user.id, targetTierEnum),
  );

  if (error) {
    console.error("Error scheduling downgrade:", error);
    return NextResponse.json(
      { error: "Failed to schedule downgrade" },
      { status: 500 },
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    effectiveDate: result.effectiveDate?.toISOString(),
    message: `Downgrade to ${targetTier} will take effect at your next billing cycle`,
  });
}

/**
 * DELETE /api/tiers/downgrade
 * Cancel scheduled downgrade
 */
export async function DELETE() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Auth error:", authError);
    return NextResponse.json({ error: "Authentication failed" }, {
      status: 500,
    });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: result, error } = await tryCatch(
    TierManager.cancelDowngrade(session.user.id),
  );

  if (error) {
    console.error("Error canceling downgrade:", error);
    return NextResponse.json(
      { error: "Failed to cancel downgrade" },
      { status: 500 },
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Scheduled downgrade has been canceled",
  });
}
