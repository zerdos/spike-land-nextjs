import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { safeDecryptToken, safeEncryptToken } from "@/lib/crypto/token-encryption";
import { GoogleAdsClient } from "@/lib/marketing/google-ads-client";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";

const routeSchema = z.object({
  marketingAccountId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { data: body, error: parseError } = await tryCatch(req.json());

  if (parseError) {
    return NextResponse.json({ error: "Invalid request body" }, {
      status: 400,
    });
  }

  const parsed = routeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { marketingAccountId } = parsed.data;

  const { data: marketingAccount, error: dbError } = await tryCatch(
    prisma.marketingAccount.findFirst({
      where: {
        id: marketingAccountId,
        userId,
        platform: "GOOGLE_ADS",
      },
    }),
  );

  if (dbError || !marketingAccount) {
    return NextResponse.json(
      { error: "Marketing account not found" },
      { status: 404 },
    );
  }

  const accessToken = safeDecryptToken(marketingAccount.accessToken);
  const refreshToken = marketingAccount.refreshToken
    ? safeDecryptToken(marketingAccount.refreshToken)
    : undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Invalid access token" },
      { status: 400 },
    );
  }

  const client = new GoogleAdsClient();
  client.setAccessToken(accessToken);

  // Refresh the token if it's expired
  if (marketingAccount.expiresAt && new Date() > marketingAccount.expiresAt) {
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Access token expired and no refresh token available" },
        { status: 401 },
      );
    }
    const { data: refreshed, error: refreshError } = await tryCatch(
      client.refreshAccessToken(refreshToken),
    );

    if (refreshError || !refreshed) {
      return NextResponse.json(
        { error: "Failed to refresh access token" },
        { status: 500 },
      );
    }
    client.setAccessToken(refreshed.accessToken);

    // Update the stored token
    const { error: updateError } = await tryCatch(
      prisma.marketingAccount.update({
        where: { id: marketingAccountId },
        data: {
          accessToken: safeEncryptToken(refreshed.accessToken),
          expiresAt: refreshed.expiresAt,
        },
      }),
    );

    if (updateError) {
      // Log the error but don't block the request, as the refreshed token is still valid for this session
      console.error(
        `Failed to update marketing account ${marketingAccountId} with new token`,
        updateError,
      );
    }
  }

  client.setCustomerId(marketingAccount.accountId);

  const { data: campaigns, error: apiError } = await tryCatch(
    client.listCampaigns(marketingAccount.accountId),
  );

  if (apiError || !campaigns) {
    return NextResponse.json(
      { error: "Failed to fetch campaigns from Google Ads" },
      { status: 500 },
    );
  }

  const { error: upsertError } = await tryCatch(
    prisma.$transaction(
      campaigns.map((campaign) =>
        prisma.googleAdsCampaign.upsert({
          where: { campaignId: campaign.id },
          update: {
            name: campaign.name,
            status: campaign.status,
            spend: 0,
          },
          create: {
            marketingAccountId,
            campaignId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            spend: 0,
          },
        })
      ),
    ),
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to save campaigns" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, campaignCount: campaigns.length });
}
