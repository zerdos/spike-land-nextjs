import { auth } from "@/auth";
import { TierManager } from "@/lib/tokens/tier-manager";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/tiers
 * Returns all available tiers with user's current tier
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Error fetching tiers:", authError);
    return NextResponse.json(
      { error: "Failed to fetch tiers" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentTier, error: tierError } = await tryCatch(
    TierManager.getUserTier(session.user.id),
  );

  if (tierError) {
    console.error("Error fetching user tier:", tierError);
    return NextResponse.json(
      { error: "Failed to fetch tier information" },
      { status: 500 },
    );
  }

  const allTiers = TierManager.getAllTiers();
  const nextTier = TierManager.getNextTier(currentTier);

  return NextResponse.json({
    tiers: allTiers.map((tier) => ({
      ...tier,
      isCurrent: tier.tier === currentTier,
    })),
    currentTier,
    canUpgrade: nextTier !== null,
    nextTier: nextTier ? TierManager.getTierInfo(nextTier) : null,
  });
}
