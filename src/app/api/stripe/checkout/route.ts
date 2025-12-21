import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStripe, SUBSCRIPTION_PLANS, TOKEN_PACKAGES } from "@/lib/stripe/client";
import type { SubscriptionPlanId, TokenPackageId } from "@/lib/stripe/client";
import { tryCatch } from "@/lib/try-catch";
import { NextRequest, NextResponse } from "next/server";

// Maximum request body size (10KB should be plenty for checkout requests)
const MAX_BODY_SIZE = 10 * 1024;

interface CheckoutRequest {
  packageId?: TokenPackageId;
  planId?: SubscriptionPlanId;
  mode: "payment" | "subscription";
}

async function processCheckout(request: NextRequest): Promise<NextResponse> {
  // Check content length to prevent oversized payloads
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const stripe = getStripe();

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch<CheckoutRequest>(
    request.json(),
  );
  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const { packageId, planId, mode } = body;

  if (mode === "payment" && !packageId) {
    return NextResponse.json({ error: "Package ID required for payment" }, {
      status: 400,
    });
  }

  if (mode === "subscription" && !planId) {
    return NextResponse.json({ error: "Plan ID required for subscription" }, {
      status: 400,
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
        metadata: {
          userId: session.user.id,
        },
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
      console.error("Error updating user with Stripe customer ID:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, {
        status: 500,
      });
    }
  }

  // Build checkout session based on mode
  const origin = request.headers.get("origin") || "http://localhost:3000";

  if (mode === "payment" && packageId) {
    const pkg = TOKEN_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package ID" }, {
        status: 400,
      });
    }

    // Validate price is a positive number
    if (
      typeof pkg.price !== "number" || pkg.price <= 0 ||
      !Number.isFinite(pkg.price)
    ) {
      console.error(
        `Invalid price configuration for package ${packageId}: ${pkg.price}`,
      );
      return NextResponse.json({ error: "Invalid package configuration" }, {
        status: 500,
      });
    }

    const { data: checkoutSession, error: checkoutError } = await tryCatch(
      stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: pkg.name,
                description: `${pkg.tokens} tokens for AI image enhancement`,
              },
              unit_amount: Math.round(pkg.price * 100), // Convert to pence
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          packageId,
          tokens: pkg.tokens.toString(),
          type: "token_purchase",
        },
        success_url: `${origin}/tokens?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=true`,
      }),
    );

    if (checkoutError) {
      console.error("Error creating payment checkout session:", checkoutError);
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

  if (mode === "subscription" && planId) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    // Validate price is a positive number
    if (
      typeof plan.priceGBP !== "number" || plan.priceGBP <= 0 ||
      !Number.isFinite(plan.priceGBP)
    ) {
      console.error(
        `Invalid price configuration for plan ${planId}: ${plan.priceGBP}`,
      );
      return NextResponse.json({ error: "Invalid plan configuration" }, {
        status: 500,
      });
    }

    // Check if user already has an active subscription
    const { data: existingSubscription, error: subscriptionError } = await tryCatch(
      prisma.subscription.findUnique({
        where: { userId: session.user.id },
      }),
    );

    if (subscriptionError) {
      console.error("Error checking existing subscription:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to check subscription status" },
        { status: 500 },
      );
    }

    if (existingSubscription && existingSubscription.status === "ACTIVE") {
      return NextResponse.json(
        {
          error: "You already have an active subscription. Please cancel it first.",
        },
        { status: 400 },
      );
    }

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
                name: `${plan.name} Plan`,
                description: `${plan.tokensPerMonth} tokens/month for AI image enhancement`,
              },
              unit_amount: Math.round(plan.priceGBP * 100),
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          planId,
          tokensPerMonth: plan.tokensPerMonth.toString(),
          maxRollover: plan.maxRollover.toString(),
          type: "subscription",
        },
        success_url: `${origin}/tokens?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=true`,
      }),
    );

    if (checkoutError) {
      console.error(
        "Error creating subscription checkout session:",
        checkoutError,
      );
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

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { data, error } = await tryCatch(processCheckout(request));

  if (error) {
    // Log detailed error for debugging but don't expose internals to client
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }

  return data;
}
