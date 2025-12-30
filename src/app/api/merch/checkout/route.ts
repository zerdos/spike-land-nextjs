/**
 * Merch Checkout API
 *
 * POST /api/merch/checkout - Create a checkout session with delayed capture
 *
 * Flow:
 * 1. Validate cart items
 * 2. Calculate totals (items + shipping + tax)
 * 3. Create MerchOrder with PENDING status
 * 4. Create Stripe PaymentIntent with capture_method: 'manual'
 * 5. Return clientSecret for Stripe Elements
 */

import { auth } from "@/auth";
import {
  EU_COUNTRY_CODES,
  FREE_SHIPPING_THRESHOLD_EU,
  FREE_SHIPPING_THRESHOLD_UK,
  SHIPPING_COST_EU,
  SHIPPING_COST_UK,
} from "@/lib/merch/constants";
import { generateOrderNumber } from "@/lib/pod";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { tryCatch } from "@/lib/try-catch";
import { type NextRequest, NextResponse } from "next/server";

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  [key: string]: string | undefined;
}

interface CheckoutRequest {
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

function getShippingZone(countryCode: string): "UK" | "EU" | "ROW" {
  if (countryCode === "GB") return "UK";
  if ((EU_COUNTRY_CODES as readonly string[]).includes(countryCode)) {
    return "EU";
  }
  return "ROW";
}

function calculateShipping(subtotalPence: number, countryCode: string): number {
  const zone = getShippingZone(countryCode);

  if (zone === "UK") {
    return subtotalPence >= FREE_SHIPPING_THRESHOLD_UK ? 0 : SHIPPING_COST_UK;
  }

  if (zone === "EU") {
    return subtotalPence >= FREE_SHIPPING_THRESHOLD_EU ? 0 : SHIPPING_COST_EU;
  }

  // ROW not supported in MVP
  throw new Error("Shipping to this region is not available yet");
}

// POST /api/merch/checkout
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());
  if (authError || !session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data: body, error: bodyError } = await tryCatch<CheckoutRequest>(
    request.json(),
  );

  if (bodyError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate shipping address
  if (
    !body.shippingAddress ||
    !body.shippingAddress.name ||
    !body.shippingAddress.line1 ||
    !body.shippingAddress.city ||
    !body.shippingAddress.postalCode ||
    !body.shippingAddress.countryCode
  ) {
    return NextResponse.json(
      { error: "Complete shipping address is required" },
      { status: 400 },
    );
  }

  // Validate shipping zone
  const zone = getShippingZone(body.shippingAddress.countryCode);
  if (zone === "ROW") {
    return NextResponse.json(
      {
        error: "Shipping to this region is not available yet. We currently ship to UK and EU only.",
      },
      { status: 400 },
    );
  }

  // Get cart with items
  const { data: cart, error: cartError } = await tryCatch(
    prisma.merchCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
            image: true,
          },
        },
      },
    }),
  );

  if (cartError || !cart || cart.items.length === 0) {
    return NextResponse.json(
      { error: "Your cart is empty" },
      { status: 400 },
    );
  }

  // Calculate subtotal
  let subtotalPence = 0;
  const orderItems: {
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    imageUrl: string;
    imageR2Key: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customText: string | null;
  }[] = [];

  for (const item of cart.items) {
    const basePrice = Number(item.product.retailPrice);
    const priceDelta = item.variant ? Number(item.variant.priceDelta) : 0;
    const unitPrice = basePrice + priceDelta;
    const totalPrice = unitPrice * item.quantity;
    subtotalPence += Math.round(totalPrice * 100);

    // Determine image URL and R2 key
    let imageUrl: string;
    let imageR2Key: string;

    if (item.image) {
      imageUrl = item.image.originalUrl;
      imageR2Key = item.image.originalR2Key;
    } else if (item.uploadedImageUrl && item.uploadedImageR2Key) {
      imageUrl = item.uploadedImageUrl;
      imageR2Key = item.uploadedImageR2Key;
    } else {
      return NextResponse.json(
        { error: `Missing image for product: ${item.product.name}` },
        { status: 400 },
      );
    }

    orderItems.push({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantName: item.variant?.name || null,
      imageUrl,
      imageR2Key,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      customText: item.customText,
    });
  }

  // Calculate shipping
  let shippingPence: number;
  try {
    shippingPence = calculateShipping(
      subtotalPence,
      body.shippingAddress.countryCode,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Shipping calculation failed",
      },
      { status: 400 },
    );
  }

  // Total (tax will be calculated by Stripe Tax)
  const totalPence = subtotalPence + shippingPence;

  // Get or create Stripe customer
  const { data: user, error: userError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true, name: true },
    }),
  );

  if (userError) {
    console.error("Error fetching user:", userError);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  let stripeCustomerId = user?.stripeCustomerId;

  if (!stripeCustomerId) {
    const { data: customer, error: customerError } = await tryCatch(
      stripe.customers.create({
        email: body.customerEmail || session.user.email,
        name: body.shippingAddress.name,
        metadata: {
          userId,
        },
      }),
    );

    if (customerError) {
      console.error("Error creating Stripe customer:", customerError);
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 },
      );
    }

    stripeCustomerId = customer.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  // Generate order number
  const orderNumber = generateOrderNumber();

  // Create order in database
  const { data: order, error: orderError } = await tryCatch(
    prisma.merchOrder.create({
      data: {
        userId,
        orderNumber,
        status: "PENDING",
        subtotal: subtotalPence / 100,
        shippingCost: shippingPence / 100,
        taxAmount: 0, // Will be updated after Stripe calculates tax
        totalAmount: totalPence / 100,
        currency: "GBP",
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingAddress || body.shippingAddress,
        customerEmail: body.customerEmail || session.user.email,
        customerPhone: body.customerPhone,
        notes: body.notes,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
            imageR2Key: item.imageR2Key,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            customText: item.customText,
          })),
        },
        events: {
          create: {
            type: "ORDER_CREATED",
            data: {
              itemCount: orderItems.length,
              subtotal: subtotalPence / 100,
              shipping: shippingPence / 100,
            },
          },
        },
      },
    }),
  );

  if (orderError) {
    console.error("Error creating order:", orderError);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }

  // Create Stripe PaymentIntent with delayed capture
  const { data: paymentIntent, error: paymentError } = await tryCatch(
    stripe.paymentIntents.create({
      amount: totalPence,
      currency: "gbp",
      customer: stripeCustomerId,
      capture_method: "manual", // Delayed capture
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        orderId: order.id,
        orderNumber,
        type: "merch_order",
      },
      description: `Spike Land Order ${orderNumber}`,
      shipping: {
        name: body.shippingAddress.name,
        address: {
          line1: body.shippingAddress.line1,
          line2: body.shippingAddress.line2 || undefined,
          city: body.shippingAddress.city,
          postal_code: body.shippingAddress.postalCode,
          country: body.shippingAddress.countryCode,
        },
        phone: body.shippingAddress.phone || undefined,
      },
      receipt_email: body.customerEmail || session.user.email,
    }),
  );

  if (paymentError || !paymentIntent) {
    console.error("Error creating PaymentIntent:", paymentError);

    // Clean up the order
    await prisma.merchOrder.delete({ where: { id: order.id } });

    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 },
    );
  }

  // Update order with PaymentIntent ID
  await prisma.merchOrder.update({
    where: { id: order.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
      stripePaymentStatus: "pending",
    },
  });

  return NextResponse.json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    orderId: order.id,
    orderNumber,
    summary: {
      subtotal: subtotalPence / 100,
      shipping: shippingPence / 100,
      shippingZone: zone,
      freeShippingThreshold: zone === "UK"
        ? FREE_SHIPPING_THRESHOLD_UK / 100
        : FREE_SHIPPING_THRESHOLD_EU / 100,
      total: totalPence / 100,
      currency: "GBP",
      itemCount: orderItems.length,
    },
  });
}
