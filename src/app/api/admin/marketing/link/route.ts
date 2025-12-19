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

import { tryCatch } from "@/lib/try-catch";

/**
 * GET - List all campaign links
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id)
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  // Optional filtering by platform
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");

  const { data: links, error: fetchError } = await tryCatch(
    prisma.campaignLink.findMany({
      where: platform ? { platform } : undefined,
      orderBy: [
        { platform: "asc" },
        { utmCampaign: "asc" },
      ],
    })
  );

  if (fetchError) {
    console.error("Failed to fetch campaign links:", fetchError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    links: (links || []) as CampaignLinkResponse[],
    total: links?.length || 0,
  });
}

/**
 * POST - Create a new campaign link
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id)
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = createLinkSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { utmCampaign, platform, externalCampaignId, externalCampaignName } = parseResult.data;

  // Check if link already exists
  const { data: existingLink, error: checkError } = await tryCatch(
    prisma.campaignLink.findUnique({
      where: {
        utmCampaign_platform: {
          utmCampaign,
          platform,
        },
      },
    })
  );

  if (checkError) {
    console.error("Database error checking existing link:", checkError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (existingLink) {
    // Update existing link
    const { data: updatedLink, error: updateError } = await tryCatch(
      prisma.campaignLink.update({
        where: { id: existingLink.id },
        data: {
          externalCampaignId,
          externalCampaignName,
          updatedAt: new Date(),
        },
      })
    );

    if (updateError) {
      console.error("Failed to update campaign link:", updateError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      link: updatedLink as CampaignLinkResponse,
      updated: true,
    });
  }

  // Create new link
  const { data: newLink, error: createError } = await tryCatch(
    prisma.campaignLink.create({
      data: {
        utmCampaign,
        platform,
        externalCampaignId,
        externalCampaignName,
      },
    })
  );

  if (createError) {
    console.error("Failed to create campaign link:", createError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { link: newLink as CampaignLinkResponse, created: true },
    { status: 201 },
  );
}

/**
 * DELETE - Remove a campaign link
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id)
  );

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());
  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = deleteLinkSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { id, utmCampaign, platform } = parseResult.data;

  let deletedLinkResult;

  if (id) {
    // Delete by ID
    deletedLinkResult = await tryCatch(
      prisma.campaignLink.delete({
        where: { id },
      })
    );
  } else if (utmCampaign && platform) {
    // Delete by composite key
    deletedLinkResult = await tryCatch(
      prisma.campaignLink.delete({
        where: {
          utmCampaign_platform: {
            utmCampaign,
            platform,
          },
        },
      })
    );
  } else {
    // Should be caught by Zod validation, but just in case
    return NextResponse.json(
      { error: "Invalid delete parameters" },
      { status: 400 },
    );
  }

  const { data: deletedLink, error: deleteError } = deletedLinkResult;

  if (deleteError) {
    console.error("Failed to delete campaign link:", deleteError);

    // Handle Prisma not found error (P2025)
    // @ts-expect-error - Prisma error typing
    if (deleteError.code === "P2025" || deleteError.message?.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Campaign link not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, deleted: deletedLink });
}
