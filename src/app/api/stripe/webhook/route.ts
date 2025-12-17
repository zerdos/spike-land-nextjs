import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { attributeConversion } from "@/lib/tracking/attribution";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Maximum request body size for webhook (64KB should be plenty for Stripe events)
const MAX_BODY_SIZE = 64 * 1024;

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  // Check content length to prevent oversized payloads
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, {
      status: 400,
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, {
      status: 500,
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(stripe, invoice);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Log detailed error for debugging but don't expose internals to client
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const {
    userId,
    type,
    tokens,
    packageId,
    planId,
    tokensPerMonth,
    maxRollover,
  } = session.metadata || {};

  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  if (type === "token_purchase" && tokens && packageId) {
    // Credit tokens for one-time purchase
    const tokenAmount = parseInt(tokens, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Get or create token balance
      let balance = await tx.userTokenBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        balance = await tx.userTokenBalance.create({
          data: { userId, balance: 0 },
        });
      }

      // Note: Purchased tokens intentionally have no balance cap.
      // Unlike regenerated tokens (capped at 100), paid tokens are unlimited
      // because users have paid for them and should receive full value.
      const newBalance = balance.balance + tokenAmount;

      // Update balance
      await tx.userTokenBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Record transaction
      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: tokenAmount,
          type: "EARN_PURCHASE",
          source: "stripe",
          sourceId: session.id,
          balanceAfter: newBalance,
          metadata: {
            packageId,
            sessionId: session.id,
            amountPaid: session.amount_total,
          },
        },
      });

      // Record Stripe payment (if package exists in DB)
      const pkg = await tx.tokensPackage.findFirst({
        where: { active: true },
      });

      if (pkg) {
        await tx.stripePayment.create({
          data: {
            userId,
            packageId: pkg.id,
            tokensGranted: tokenAmount,
            amountUSD: (session.amount_total || 0) / 100,
            stripePaymentIntentId: session.payment_intent as string ||
              session.id,
            status: "SUCCEEDED",
            metadata: { packageId, sessionId: session.id },
          },
        });
      }
    });

    console.log(`[Stripe] Credited ${tokenAmount} tokens to user ${userId}`);

    // Track purchase conversion attribution for campaign analytics
    await attributeConversion(userId, "PURCHASE", (session.amount_total || 0) / 100).catch(
      (error) => {
        console.error("Failed to track purchase attribution:", error);
      },
    );
  }

  if (type === "subscription" && planId && tokensPerMonth) {
    // Create subscription record
    const stripeSubscriptionId = session.subscription as string;
    const subscriptionData = await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
    );

    // Stripe v20+: billing period is on subscription item, not subscription level
    const firstItem = subscriptionData.items.data[0];
    const currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : new Date();
    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Create or update subscription
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeSubscriptionId,
          stripePriceId: firstItem?.price.id || "",
          status: "ACTIVE",
          currentPeriodStart,
          currentPeriodEnd,
          tokensPerMonth: parseInt(tokensPerMonth, 10),
          maxRollover: parseInt(maxRollover || "0", 10),
          rolloverTokens: 0,
        },
        update: {
          stripeSubscriptionId,
          stripePriceId: firstItem?.price.id || "",
          status: "ACTIVE",
          currentPeriodStart,
          currentPeriodEnd,
          tokensPerMonth: parseInt(tokensPerMonth, 10),
          maxRollover: parseInt(maxRollover || "0", 10),
        },
      });

      // Credit initial tokens
      let balance = await tx.userTokenBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        balance = await tx.userTokenBalance.create({
          data: { userId, balance: 0 },
        });
      }

      const tokenAmount = parseInt(tokensPerMonth, 10);
      const newBalance = balance.balance + tokenAmount;

      await tx.userTokenBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: tokenAmount,
          type: "EARN_PURCHASE",
          source: "subscription",
          sourceId: stripeSubscriptionId,
          balanceAfter: newBalance,
          metadata: {
            planId,
            subscriptionId: stripeSubscriptionId,
            period: "initial",
          },
        },
      });
    });

    console.log(
      `[Stripe] Created subscription for user ${userId}, credited ${tokensPerMonth} tokens`,
    );

    // Track purchase conversion attribution for campaign analytics (subscription)
    await attributeConversion(userId, "PURCHASE", (session.amount_total || 0) / 100).catch(
      (error) => {
        console.error("Failed to track subscription purchase attribution:", error);
      },
    );
  }
}

async function handleInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice) {
  // This handles recurring subscription payments
  // Stripe v20+: subscription is now in parent.subscription_details.subscription
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  const subscriptionIdString = typeof subscriptionId === "string"
    ? subscriptionId
    : subscriptionId?.id;

  if (
    !subscriptionIdString || invoice.billing_reason === "subscription_create"
  ) {
    // Skip initial subscription invoice (handled in checkout.session.completed)
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    subscriptionIdString,
  );
  const customerId = invoice.customer as string;

  // Stripe v20+: billing period is on subscription item, not subscription level
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (!user || !user.subscription) {
    console.error(`No user or subscription found for customer ${customerId}`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    const sub = user.subscription!;

    // Calculate rollover tokens
    let balance = await tx.userTokenBalance.findUnique({
      where: { userId: user.id },
    });

    if (!balance) {
      balance = await tx.userTokenBalance.create({
        data: { userId: user.id, balance: 0 },
      });
    }

    // Rollover logic: cap at maxRollover (0 means unlimited)
    let rolloverTokens = balance.balance;
    if (sub.maxRollover > 0) {
      rolloverTokens = Math.min(rolloverTokens, sub.maxRollover);
    }

    const newBalance = rolloverTokens + sub.tokensPerMonth;

    // Update subscription period
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodStart,
        currentPeriodEnd,
        rolloverTokens,
      },
    });

    // Update balance
    await tx.userTokenBalance.update({
      where: { userId: user.id },
      data: { balance: newBalance },
    });

    // Record transaction
    await tx.tokenTransaction.create({
      data: {
        userId: user.id,
        amount: sub.tokensPerMonth,
        type: "EARN_PURCHASE",
        source: "subscription_renewal",
        sourceId: invoice.id,
        balanceAfter: newBalance,
        metadata: {
          rolloverTokens,
          invoiceId: invoice.id,
        },
      },
    });
  });

  console.log(`[Stripe] Renewed subscription for user ${user.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!sub) return;

  // Stripe v20+: billing period is on subscription item, not subscription level
  const firstItem = subscription.items.data[0];
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: subscription.status === "active"
        ? "ACTIVE"
        : subscription.status === "past_due"
        ? "PAST_DUE"
        : subscription.status === "canceled"
        ? "CANCELED"
        : subscription.status === "unpaid"
        ? "UNPAID"
        : "ACTIVE",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "CANCELED" },
  });
}
