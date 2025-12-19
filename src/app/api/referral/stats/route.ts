import { auth } from "@/auth";
import { getReferralStats, getReferredUsers } from "@/lib/referral/rewards";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/referral/stats
 * Get referral statistics for authenticated user
 */
export async function GET() {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError) {
    console.error("Failed to authenticate:", authError);
    return NextResponse.json(
      { error: "Failed to retrieve referral statistics" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get stats and referred users
  const { data: results, error: statsError } = await tryCatch(
    Promise.all([
      getReferralStats(session.user.id),
      getReferredUsers(session.user.id),
    ]),
  );

  if (statsError) {
    console.error("Failed to get referral stats:", statsError);
    return NextResponse.json(
      { error: "Failed to retrieve referral statistics" },
      { status: 500 },
    );
  }

  const [stats, referredUsers] = results;

  return NextResponse.json({
    stats,
    referredUsers,
  });
}
