/**
 * Prodigi Webhook Handler
 *
 * POST /api/merch/webhooks/prodigi - Handle Prodigi order status updates
 *
 * Webhook events:
 * - order.created
 * - order.status.stage.changed
 * - order.shipment.created
 * - order.shipment.tracking.updated
 */

import { updateOrderFromWebhook } from "@/lib/pod";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

interface ProdigiWebhookEvent {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: {
    order: {
      id: string;
      merchantReference: string;
      status: {
        stage: string;
        details: {
          downloadAssets: string;
          printReadyAssetsPrepared: string;
          allocateProductionLocation: string;
          inProduction: string;
          shipping: string;
        };
      };
      shipments?: Array<{
        id: string;
        status: string;
        carrier?: {
          name: string;
          service?: string;
        };
        tracking?: {
          number?: string;
          url?: string;
        };
        dispatchDate?: string;
      }>;
    };
  };
}

/**
 * Verify webhook signature from Prodigi.
 * Prodigi uses HMAC-SHA256 signatures.
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.PRODIGI_WEBHOOK_SECRET;

  // Get raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-prodigi-signature");

  // Verify signature if secret is configured
  if (webhookSecret) {
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid Prodigi webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
  } else {
    console.warn("PRODIGI_WEBHOOK_SECRET not configured - skipping signature verification");
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }
  }

  // Parse the webhook event
  let event: ProdigiWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("Failed to parse Prodigi webhook payload");
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  // Check for duplicate events (idempotency)
  const { data: existingEvent, error: findError } = await tryCatch(
    prisma.merchWebhookEvent.findUnique({
      where: { eventId: event.id },
    }),
  );

  if (findError) {
    console.error("Error checking webhook event:", findError);
    // Continue processing - better to risk duplicate than miss event
  }

  if (existingEvent?.processed) {
    // Already processed this event
    return NextResponse.json({ success: true, message: "Event already processed" });
  }

  // Store the event
  const { error: storeError } = await tryCatch(
    prisma.merchWebhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        provider: "PRODIGI",
        eventType: event.type,
        payload: event as object,
      },
      update: {},
    }),
  );

  if (storeError) {
    console.error("Error storing webhook event:", storeError);
    // Continue processing
  }

  // Process the event based on type
  const { error: processError } = await tryCatch(
    processProdigiEvent(event),
  );

  if (processError) {
    console.error("Error processing Prodigi webhook:", processError);

    // Store error but still return 200 to prevent retries for unrecoverable errors
    await prisma.merchWebhookEvent.update({
      where: { eventId: event.id },
      data: {
        processed: false,
        payload: {
          ...(event as object),
          processingError: processError.message,
        },
      },
    });

    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }

  // Mark event as processed
  await prisma.merchWebhookEvent.update({
    where: { eventId: event.id },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

async function processProdigiEvent(event: ProdigiWebhookEvent): Promise<void> {
  const providerOrderId = event.data.order.id;
  const stage = event.data.order.status.stage;
  const shipments = event.data.order.shipments || [];

  // Find tracking info from shipments
  const shippedShipment = shipments.find(
    (s) => s.status === "Shipped" || s.tracking?.number,
  );

  switch (event.type) {
    case "order.created":
      // Order was created in Prodigi - we should already have this recorded
      console.log(`Prodigi order created: ${providerOrderId}`);
      break;

    case "order.status.stage.changed":
      // Order status changed - update our records
      await updateOrderFromWebhook(
        providerOrderId,
        "PRODIGI",
        stage,
        shippedShipment?.tracking?.number,
        shippedShipment?.tracking?.url,
        shippedShipment?.carrier?.name,
      );
      break;

    case "order.shipment.created":
    case "order.shipment.tracking.updated":
      // Shipment created or tracking updated
      if (shippedShipment) {
        await updateOrderFromWebhook(
          providerOrderId,
          "PRODIGI",
          "Shipped",
          shippedShipment.tracking?.number,
          shippedShipment.tracking?.url,
          shippedShipment.carrier?.name,
        );
      }
      break;

    default:
      console.log(`Unhandled Prodigi webhook event type: ${event.type}`);
  }
}
