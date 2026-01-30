/**
 * Google Ads Webhook Handler
 * Processes real-time campaign performance updates from Google Ads
 * Issue #565 - Content-to-Ads Loop
 */

import prisma from "@/lib/prisma";
import crypto from "crypto";
import type { WebhookPayload } from "../types";

/**
 * Handle Google Ads webhook payload
 * Verifies signature and processes campaign update events
 */
export async function handlePostUpdate(payload: WebhookPayload): Promise<void> {
  // Verify webhook signature
  if (!verifyGoogleAdsSignature(payload)) {
    throw new Error("Invalid webhook signature");
  }

  const { event, data } = payload;

  switch (event) {
    case "campaign.performance_update":
      await handleCampaignPerformanceUpdate(data);
      break;
    case "campaign.status_change":
      await handleCampaignStatusChange(data);
      break;
    default:
      console.log(`Unhandled Google Ads webhook event: ${event}`);
  }
}

/**
 * Verify Google Ads webhook signature
 * Uses HMAC-SHA256 verification similar to Facebook
 */
function verifyGoogleAdsSignature(payload: WebhookPayload): boolean {
  const WEBHOOK_SECRET = process.env["GOOGLE_ADS_WEBHOOK_SECRET"];
  if (!WEBHOOK_SECRET) {
    console.error("GOOGLE_ADS_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(JSON.stringify(payload.data))
      .digest("hex");

    const receivedSignature = payload.signature.replace("sha256=", "");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    );
  } catch (error) {
    console.error("Error verifying Google Ads signature:", error);
    return false;
  }
}

/**
 * Handle campaign performance update from Google Ads
 * Updates AppliedBoost records with latest metrics
 */
async function handleCampaignPerformanceUpdate(
  data: Record<string, unknown>,
): Promise<void> {
  const campaignId = data["campaign_id"] as string;
  const metrics = data["metrics"] as Record<string, number>;

  if (!campaignId || !metrics) {
    console.error("Invalid campaign performance payload:", data);
    return;
  }

  try {
    // Find AppliedBoost record
    const appliedBoost = await prisma.appliedBoost.findFirst({
      where: {
        externalCampaignId: campaignId,
        platform: "GOOGLE_ADS",
      },
    });

    if (!appliedBoost) {
      console.log(`No boost found for campaign ${campaignId}`);
      return;
    }

    // Google Ads metrics are in micros (millionths)
    const actualSpend = (metrics["cost_micros"] || 0) / 1000000;
    const actualConversions = metrics["conversions"] || 0;

    // Calculate ROI
    const conversionValue = actualConversions * 50; // $50 per conversion
    const actualROI = actualSpend > 0 ? (conversionValue - actualSpend) / actualSpend : 0;

    // Update AppliedBoost record
    await prisma.appliedBoost.update({
      where: { id: appliedBoost.id },
      data: {
        actualImpressions: metrics["impressions"] || appliedBoost.actualImpressions,
        actualClicks: metrics["clicks"] || appliedBoost.actualClicks,
        actualConversions,
        actualSpend,
        actualROI,
      },
    });

    // Also update the recommendation record
    await prisma.postBoostRecommendation.update({
      where: { id: appliedBoost.recommendationId },
      data: {
        actualSpend,
        actualROI,
      },
    });

    console.log(`Updated campaign metrics for ${campaignId}`);
  } catch (error) {
    console.error(`Error updating campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Handle campaign status change from Google Ads
 * Updates AppliedBoost status when campaigns are paused or completed
 */
async function handleCampaignStatusChange(
  data: Record<string, unknown>,
): Promise<void> {
  const campaignId = data["campaign_id"] as string;
  const newStatus = data["status"] as string;

  if (!campaignId || !newStatus) {
    console.error("Invalid campaign status change payload:", data);
    return;
  }

  try {
    // Find AppliedBoost record
    const appliedBoost = await prisma.appliedBoost.findFirst({
      where: {
        externalCampaignId: campaignId,
        platform: "GOOGLE_ADS",
      },
    });

    if (!appliedBoost) {
      console.log(`No boost found for campaign ${campaignId}`);
      return;
    }

    // Map Google Ads status to our status enum
    let boostStatus: "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED" = "ACTIVE";

    switch (newStatus) {
      case "ENABLED":
      case "RUNNING":
        boostStatus = "ACTIVE";
        break;
      case "PAUSED":
        boostStatus = "PAUSED";
        break;
      case "ENDED":
      case "REMOVED":
        boostStatus = "COMPLETED";
        break;
      case "FAILED":
      case "ERROR":
        boostStatus = "FAILED";
        break;
    }

    // Update AppliedBoost status
    await prisma.appliedBoost.update({
      where: { id: appliedBoost.id },
      data: {
        status: boostStatus,
        ...(boostStatus === "COMPLETED" && { endedAt: new Date() }),
      },
    });

    console.log(
      `Updated campaign ${campaignId} status to ${boostStatus}`,
    );
  } catch (error) {
    console.error(`Error updating campaign status ${campaignId}:`, error);
    throw error;
  }
}
