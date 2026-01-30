/**
 * Facebook Webhook Handler
 * Processes real-time post performance updates from Facebook
 * Issue #565 - Content-to-Ads Loop
 */

import prisma from "@/lib/prisma";
import crypto from "crypto";
import type { WebhookPayload } from "../types";

/**
 * Handle Facebook webhook payload
 * Verifies signature and processes post update events
 */
export async function handlePostUpdate(payload: WebhookPayload): Promise<void> {
  // Verify webhook signature
  if (!verifyFacebookSignature(payload)) {
    throw new Error("Invalid webhook signature");
  }

  const { event, data } = payload;

  switch (event) {
    case "post_insights_update":
      await handlePostInsightsUpdate(data);
      break;
    case "campaign_update":
      await handleCampaignUpdate(data);
      break;
    default:
      console.log(`Unhandled Facebook webhook event: ${event}`);
  }
}

/**
 * Verify Facebook webhook signature
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
function verifyFacebookSignature(payload: WebhookPayload): boolean {
  const APP_SECRET = process.env["FACEBOOK_APP_SECRET"];
  if (!APP_SECRET) {
    console.error("FACEBOOK_APP_SECRET not configured");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", APP_SECRET)
      .update(JSON.stringify(payload.data))
      .digest("hex");

    const receivedSignature = payload.signature.replace("sha256=", "");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    );
  } catch (error) {
    console.error("Error verifying Facebook signature:", error);
    return false;
  }
}

/**
 * Handle post insights update from Facebook
 * Updates PostPerformance records with new metrics
 */
async function handlePostInsightsUpdate(data: Record<string, unknown>): Promise<void> {
  const postId = data["post_id"] as string;
  const insights = data["insights"] as Record<string, number>;

  if (!postId || !insights) {
    console.error("Invalid post insights payload:", data);
    return;
  }

  try {
    // Find existing PostPerformance record
    const performance = await prisma.postPerformance.findFirst({
      where: {
        postId,
        postType: "SOCIAL_POST", // Facebook posts are SocialPost type
      },
      orderBy: {
        checkedAt: "desc",
      },
    });

    if (!performance) {
      console.log(`No performance record found for post ${postId}`);
      return;
    }

    // Calculate new metrics
    const newImpressions = insights["impressions"] || performance.impressions;
    const newEngagements = (insights["likes"] || 0) +
      (insights["comments"] || 0) +
      (insights["shares"] || 0);
    const newEngagementRate = newImpressions > 0 ? newEngagements / newImpressions : 0;

    // Calculate velocity (engagements per hour since last check)
    const hoursSinceCheck = (Date.now() - performance.checkedAt.getTime()) / (1000 * 60 * 60);
    const engagementDelta = newEngagements - performance.engagementCount;
    const newEngagementVelocity = hoursSinceCheck > 0 ? engagementDelta / hoursSinceCheck : 0;

    // Update performance record
    await prisma.postPerformance.update({
      where: { id: performance.id },
      data: {
        impressions: newImpressions,
        engagementCount: newEngagements,
        engagementRate: newEngagementRate,
        engagementVelocity: newEngagementVelocity,
        clicks: insights["clicks"] || performance.clicks,
        checkedAt: new Date(),
      },
    });

    console.log(`Updated performance for post ${postId}`);
  } catch (error) {
    console.error(`Error updating post insights for ${postId}:`, error);
    throw error;
  }
}

/**
 * Handle campaign update from Facebook
 * Updates AppliedBoost records with campaign performance
 */
async function handleCampaignUpdate(data: Record<string, unknown>): Promise<void> {
  const campaignId = data["campaign_id"] as string;
  const insights = data["insights"] as Record<string, number>;

  if (!campaignId || !insights) {
    console.error("Invalid campaign update payload:", data);
    return;
  }

  try {
    // Find AppliedBoost record
    const appliedBoost = await prisma.appliedBoost.findFirst({
      where: {
        externalCampaignId: campaignId,
        platform: "FACEBOOK",
      },
    });

    if (!appliedBoost) {
      console.log(`No boost found for campaign ${campaignId}`);
      return;
    }

    // Calculate ROI
    const actualSpend = insights["spend"] || 0;
    const actualConversions = insights["conversions"] || 0;
    const conversionValue = actualConversions * 50; // $50 per conversion
    const actualROI = actualSpend > 0 ? (conversionValue - actualSpend) / actualSpend : 0;

    // Update AppliedBoost record
    await prisma.appliedBoost.update({
      where: { id: appliedBoost.id },
      data: {
        actualImpressions: insights["impressions"] || appliedBoost.actualImpressions,
        actualClicks: insights["clicks"] || appliedBoost.actualClicks,
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
