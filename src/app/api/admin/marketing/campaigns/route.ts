/**
 * Marketing Campaigns API Route
 *
 * GET /api/admin/marketing/campaigns - List campaigns from all connected accounts
 */

import { auth } from "@/auth";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import { Campaign, createMarketingClient, MarketingPlatform } from "@/lib/marketing";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const isAdmin = await isAdminByUserId(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform") as MarketingPlatform | null;
    const accountId = searchParams.get("accountId");

    // Get connected accounts
    const whereClause: {
      userId: string;
      isActive: boolean;
      platform?: MarketingPlatform;
      accountId?: string;
    } = {
      userId: session.user.id,
      isActive: true,
    };

    if (platform) {
      whereClause.platform = platform;
    }

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const accounts = await prisma.marketingAccount.findMany({
      where: whereClause,
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        campaigns: [],
        message: "No connected accounts found",
      });
    }

    // Fetch campaigns from each account
    const allCampaigns: Campaign[] = [];
    const errors: { platform: string; accountId: string; error: string; }[] = [];

    for (const account of accounts) {
      try {
        // Decrypt the access token before using it
        const decryptedAccessToken = safeDecryptToken(account.accessToken);

        const client = createMarketingClient(
          account.platform as MarketingPlatform,
          {
            accessToken: decryptedAccessToken,
            customerId: account.accountId,
          },
        );

        if ("setCustomerId" in client && account.platform === "GOOGLE_ADS") {
          (client as { setCustomerId: (id: string) => void; }).setCustomerId(
            account.accountId,
          );
        }

        const campaigns = await client.listCampaigns(account.accountId);
        allCampaigns.push(...campaigns);
      } catch (error) {
        console.error(
          `Failed to fetch campaigns for ${account.platform}/${account.accountId}:`,
          error,
        );
        // Don't expose internal error details
        errors.push({
          platform: account.platform,
          accountId: account.accountId,
          error: "Failed to fetch campaigns for this account",
        });
      }
    }

    // Sort campaigns by name
    allCampaigns.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      campaigns: allCampaigns,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}
