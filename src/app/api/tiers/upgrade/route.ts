import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStripe, TIER_SUBSCRIPTIONS } from "@/lib/stripe/client";
import type { TierSubscriptionId } from "@/lib/stripe/client";
import { TierManager } from "@/lib/tokens/tier-manager";
import { tryCatch } from "@/lib/try-catch";
import { SubscriptionTier } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAX_BODY_SIZE = 10 * 1024;

interface UpgradeRequest {
  targetTier: TierSubscriptionId;
}

/**
 * POST /api/tiers/upgrade
 * Initiate tier upgrade via Stripe checkout
 */
export async function POST(request: NextRequest) {
  // Check content length
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const stripe = getStripe();

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch<UpgradeRequest>(
    request.json(),
  );
  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { targetTier } = body;

  if (!targetTier || !TIER_SUBSCRIPTIONS[targetTier]) {
    return NextResponse.json({ error: "Invalid target tier" }, { status: 400 });
  }

  // Get user's current tier
  const { data: currentTier, error: tierError } = await tryCatch(
    TierManager.getUserTier(session.user.id),
  );

  if (tierError) {
    console.error("Error getting user tier:", tierError);
    return NextResponse.json({ error: "Failed to get user tier" }, {
      status: 500,
    });
  }

  // Convert string to enum for comparison
  const targetTierEnum = SubscriptionTier[targetTier as keyof typeof SubscriptionTier];

  // Validate upgrade is sequential
  if (!TierManager.canUpgradeTo(currentTier, targetTierEnum)) {
    return NextResponse.json(
      {
        error: `Cannot upgrade from ${currentTier} to ${targetTier}. Upgrades must be sequential.`,
      },
      { status: 400 },
    );
  }

  const tierConfig = TIER_SUBSCRIPTIONS[targetTier];

  // Validate price
  if (
    typeof tierConfig.priceGBP !== "number" ||
    tierConfig.priceGBP <= 0 ||
    !Number.isFinite(tierConfig.priceGBP)
  ) {
    console.error(
      `Invalid price for tier ${targetTier}: ${tierConfig.priceGBP}`,
    );
    return NextResponse.json({ error: "Invalid tier configuration" }, {
      status: 500,
    });
  }

  // Get or create Stripe customer
  const { data: user, error: userError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    }),
  );

  if (userError) {
    console.error("Error fetching user:", userError);
    return NextResponse.json({ error: "Failed to fetch user" }, {
      status: 500,
    });
  }

  let stripeCustomerId = user?.stripeCustomerId;

  if (!stripeCustomerId) {
    const { data: customer, error: customerError } = await tryCatch(
      stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: { userId: session.user.id },
      }),
    );

    if (customerError) {
      console.error("Error creating Stripe customer:", customerError);
      return NextResponse.json({ error: "Failed to create customer" }, {
        status: 500,
      });
    }

    stripeCustomerId = customer.id;

    const { error: updateError } = await tryCatch(
      prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId },
      }),
    );

    if (updateError) {
      // Log but don't fail - the Stripe customer was created successfully
      // and we can still proceed with the checkout
      console.error(
        "Failed to save Stripe customer ID to database:",
        updateError,
      );
    }
  }

  // Check for existing active subscription
  const { data: existingSubscription } = await tryCatch(
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true, tier: true },
    }),
  );

  if (existingSubscription?.status === "ACTIVE") {
    // User already has a subscription - they need to upgrade through subscription management
    return NextResponse.json(
      {
        error:
          "You already have an active subscription. Please manage your tier through the subscription settings.",
      },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") || "http://localhost:3000";

  // Create checkout session for tier subscription
  const { data: checkoutSession, error: checkoutError } = await tryCatch(
    stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Token Well - ${tierConfig.name}`,
              description: tierConfig.description,
            },
            unit_amount: Math.round(tierConfig.priceGBP * 100),
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        tier: targetTier,
        previousTier: currentTier,
        wellCapacity: tierConfig.wellCapacity.toString(),
        type: "tier_upgrade",
      },
      success_url: `${origin}/settings/subscription?upgrade=success&tier=${targetTier}`,
      cancel_url: `${origin}/pricing?canceled=true`,
    }),
  );

  if (checkoutError) {
    console.error("Error creating tier upgrade checkout:", checkoutError);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    sessionId: checkoutSession.id,
    url: checkoutSession.url,
  });
}
