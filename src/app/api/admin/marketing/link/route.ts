/**
 * Campaign Linking API Route
 *
 * POST /api/admin/marketing/link - Link UTM campaign to external platform campaign
 * GET /api/admin/marketing/link - List existing campaign links
 * DELETE /api/admin/marketing/link - Remove a campaign link
 *
 * Allows admins to associate UTM campaign names with external campaign IDs
 * from Facebook Ads or Google Ads for ROI calculation.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const VALID_PLATFORMS = ["FACEBOOK", "GOOGLE_ADS"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const createLinkSchema = z.object({
  utmCampaign: z.string().min(1, "UTM campaign is required"),
  platform: z.enum(VALID_PLATFORMS, {
    message: "Platform must be FACEBOOK or GOOGLE_ADS",
  }),
  externalCampaignId: z.string().min(1, "External campaign ID is required"),
  externalCampaignName: z.string().optional(),
});

const deleteLinkSchema = z.object({
  id: z.string().optional(),
  utmCampaign: z.string().optional(),
  platform: z.enum(VALID_PLATFORMS).optional(),
}).refine(
  (data) => data.id || (data.utmCampaign && data.platform),
  { message: "Either id or both utmCampaign and platform are required" },
);

interface CampaignLinkResponse {
  id: string;
  utmCampaign: string;
  platform: Platform;
  externalCampaignId: string;
  externalCampaignName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET - List all campaign links
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    // Optional filtering by platform
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform");

    const links = await prisma.campaignLink.findMany({
      where: platform ? { platform } : undefined,
      orderBy: [
        { platform: "asc" },
        { utmCampaign: "asc" },
      ],
    });

    return NextResponse.json({
      links: links as CampaignLinkResponse[],
      total: links.length,
    });
  } catch (error) {
    console.error("Failed to fetch campaign links:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Create a new campaign link
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
    const parseResult = createLinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { utmCampaign, platform, externalCampaignId, externalCampaignName } = parseResult.data;

    // Check if link already exists
    const existingLink = await prisma.campaignLink.findUnique({
      where: {
        utmCampaign_platform: {
          utmCampaign,
          platform,
        },
      },
    });

    if (existingLink) {
      // Update existing link
      const updatedLink = await prisma.campaignLink.update({
        where: { id: existingLink.id },
        data: {
          externalCampaignId,
          externalCampaignName,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        link: updatedLink as CampaignLinkResponse,
        updated: true,
      });
    }

    // Create new link
    const newLink = await prisma.campaignLink.create({
      data: {
        utmCampaign,
        platform,
        externalCampaignId,
        externalCampaignName,
      },
    });

    return NextResponse.json(
      { link: newLink as CampaignLinkResponse, created: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create campaign link:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove a campaign link
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    const body = await request.json();
    const parseResult = deleteLinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { id, utmCampaign, platform } = parseResult.data;

    let deletedLink;

    if (id) {
      // Delete by ID
      deletedLink = await prisma.campaignLink.delete({
        where: { id },
      });
    } else if (utmCampaign && platform) {
      // Delete by composite key
      deletedLink = await prisma.campaignLink.delete({
        where: {
          utmCampaign_platform: {
            utmCampaign,
            platform,
          },
        },
      });
    }

    if (!deletedLink) {
      return NextResponse.json(
        { error: "Campaign link not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, deleted: deletedLink });
  } catch (error) {
    console.error("Failed to delete campaign link:", error);

    // Handle Prisma not found error
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json(
        { error: "Campaign link not found" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
