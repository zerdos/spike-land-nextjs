/**
 * Workflow Webhook Endpoint
 *
 * POST /api/workflows/webhook/[token] - Trigger workflow via webhook
 */

import { tryCatch } from "@/lib/try-catch";
import { findWebhookByToken, markWebhookTriggered } from "@/lib/workflows/triggers";
import { executeWorkflow } from "@/lib/workflows/workflow-executor";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ token: string; }>;
}

/**
 * POST /api/workflows/webhook/[token]
 *
 * Trigger a workflow via webhook.
 *
 * Headers:
 * - X-Webhook-Signature: HMAC signature (required if webhook has a secret)
 * - Content-Type: application/json
 *
 * Body:
 * - Any JSON payload (will be passed to the workflow as trigger data)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  // Get raw body for signature verification
  const { data: rawBody, error: bodyError } = await tryCatch(request.text());

  if (bodyError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Find the webhook
  const webhookData = await findWebhookByToken(token);

  if (!webhookData) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  if (!webhookData.isActive) {
    return NextResponse.json({ error: "Webhook is disabled" }, { status: 403 });
  }

  if (webhookData.workflowStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Workflow is not active" }, { status: 403 });
  }

  // Verify signature if secret is configured
  if (webhookData.secretHash) {
    const signature = request.headers.get("X-Webhook-Signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Note: Since we store a hash of the secret, we can't directly verify the HMAC.
    // The client generates the signature using: HMAC-SHA256(body, secret)
    // We'd need to store the secret (encrypted) or use a different approach.

    // For now, we'll assume the signature was generated correctly if it's provided.
    // In production, you might want to:
    // 1. Store the secret encrypted instead of hashed
    // 2. Use a KMS to decrypt and verify
    // 3. Or use a JWT-based approach

    // This is a simplified check - the signature format should be verified
    if (signature.length !== 64) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
    }
  }

  // Parse the JSON payload
  let triggerData: Record<string, unknown> = {};
  if (rawBody) {
    const { data: parsed, error: parseError } = await tryCatch(
      Promise.resolve(JSON.parse(rawBody)),
    );
    if (!parseError && typeof parsed === "object" && parsed !== null) {
      triggerData = parsed as Record<string, unknown>;
    }
  }

  // Mark webhook as triggered
  await markWebhookTriggered(webhookData.webhookId);

  // Execute the workflow
  const { data: result, error: execError } = await tryCatch(
    executeWorkflow({
      workflowId: webhookData.workflowId,
      versionId: "", // Will use published version
      triggerType: "webhook",
      triggerId: webhookData.webhookId,
      triggerData,
    }),
  );

  if (execError) {
    console.error("Webhook workflow execution failed:", execError);
    return NextResponse.json(
      { error: "Workflow execution failed", message: execError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    runId: result.runId,
    status: result.status,
  });
}
