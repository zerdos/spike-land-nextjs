import { auth } from "@/auth";
import { TOKEN_PACKAGES } from "@/lib/stripe/client";
import { TierManager } from "@/lib/tokens/tier-manager";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/tiers/check-upgrade-prompt
 * Check if user should see upgrade prompt (balance = 0)
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Auth error:", authError);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: promptResult, error: promptError } = await tryCatch(
    TierManager.shouldPromptUpgrade(session.user.id),
  );

  if (promptError) {
    console.error("Error checking upgrade prompt:", promptError);
    return NextResponse.json(
      { error: "Failed to check upgrade status" },
      { status: 500 },
    );
  }

  // If Premium user at 0 balance, get their options
  if (promptResult.isPremiumAtZero) {
    const { data: options, error: optionsError } = await tryCatch(
      TierManager.getPremiumZeroBalanceOptions(session.user.id),
    );

    if (optionsError) {
      console.error("Error getting premium options:", optionsError);
    }

    // Get available token packs for purchase
    const tokenPacks = Object.entries(TOKEN_PACKAGES).map(([id, pack]) => ({
      id,
      name: pack.name,
      tokens: pack.tokens,
      price: pack.price,
    }));

    return NextResponse.json({
      showUpgradePrompt: false,
      isPremiumAtZero: true,
      currentTier: promptResult.currentTier,
      options: {
        timeUntilNextRegen: options?.timeUntilNextRegen ?? 0,
        tokenPacks,
      },
    });
  }

  // Regular upgrade prompt response
  return NextResponse.json({
    showUpgradePrompt: promptResult.shouldPrompt,
    isPremiumAtZero: false,
    currentTier: promptResult.currentTier,
    nextTier: promptResult.nextTier,
  });
}
