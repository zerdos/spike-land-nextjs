/**
 * Approve Boost API
 *
 * Approves and launches a boosted post campaign
 *
 * POST /api/orbit/boost/[boostId]/approve
 *
 * Resolves #521
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getBoost } from "@/lib/orbit/boost/boost-service";
import { createGoogleAdsCampaign } from "@/lib/orbit/boost/platform-integrations/google-ads-boost";
import { createFacebookAdsCampaign } from "@/lib/orbit/boost/platform-integrations/facebook-ads-boost";
import { GoogleAdsClient } from "@/lib/marketing/google-ads-client";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ boostId: string; }>; },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boostId } = await params;

    // Get boost
    const boost = await getBoost(boostId);

    if (!boost) {
      return NextResponse.json({ error: "Boost not found" }, { status: 404 });
    }

    // Verify workspace access
    const workspace = await db.workspace.findUnique({
      where: { id: boost.workspaceId },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can approve boosts" },
        { status: 403 },
      );
    }

    // Verify boost is in correct status
    if (boost.status !== "DRAFT" && boost.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Boost is not in draft or pending approval status" },
        { status: 400 },
      );
    }

    // Extract targeting and creative from audienceSuggestions
    const suggestions = boost.audienceSuggestions as
      | {
          creative?: any;
          targeting?: any;
        }
      | null;

    let platformCampaignId: string | undefined;
    let platformAdId: string | undefined;

    // Launch campaign on platform
    try {
      if (boost.platform === "GOOGLE_ADS") {
        // Get Google Ads credentials
        // TODO: Fetch from user's connected accounts
        const client = new GoogleAdsClient();
        const customerId = "CUSTOMER_ID"; // TODO: Get from workspace settings

        const result = await createGoogleAdsCampaign(
          client,
          customerId,
          boost.campaignName,
          Number(boost.budget),
          boost.duration,
          suggestions?.creative || {},
          suggestions?.targeting || {},
        );

        platformCampaignId = result.campaignId;
        platformAdId = result.adId;
      } else if (
        boost.platform === "FACEBOOK" ||
        boost.platform === "INSTAGRAM"
      ) {
        // Get Facebook access token
        // TODO: Fetch from user's connected accounts
        const accessToken = "ACCESS_TOKEN";
        const adAccountId = "AD_ACCOUNT_ID";

        const result = await createFacebookAdsCampaign(
          accessToken,
          adAccountId,
          boost.campaignName,
          Number(boost.budget),
          boost.duration,
          suggestions?.creative || {},
          suggestions?.targeting || {},
        );

        platformCampaignId = result.campaignId;
        platformAdId = result.adId;
      } else {
        throw new Error(`Platform ${boost.platform} not yet supported`);
      }
    } catch (platformError) {
      console.error("Error launching campaign on platform:", platformError);

      // Update boost to failed status
      await db.boostedPost.update({
        where: { id: boostId },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          error: "Failed to launch campaign on platform",
          details:
            platformError instanceof Error
              ? platformError.message
              : String(platformError),
        },
        { status: 500 },
      );
    }

    // Update boost status to ACTIVE
    const updatedBoost = await db.boostedPost.update({
      where: { id: boostId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedById: session.user.id,
        startedAt: new Date(),
        platformCampaignId,
        platformAdId,
      },
      include: {
        originalPost: {
          include: {
            performance: true,
          },
        },
      },
    });

    // Mark the organic post as boosted
    await db.organicPostPerformance.update({
      where: {
        socialPostId: boost.originalPostId,
      },
      data: {
        boosted: true,
      },
    });

    return NextResponse.json({
      success: true,
      boost: updatedBoost,
      platformCampaignId,
      platformAdId,
    });
  } catch (error) {
    console.error("Error approving boost:", error);
    return NextResponse.json(
      {
        error: "Failed to approve boost",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
