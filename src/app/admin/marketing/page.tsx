/**
 * Admin Marketing Dashboard
 *
 * Manage Facebook Marketing and Google Ads integrations.
 * View connected accounts, campaigns, and analytics.
 */

import { auth } from "@/auth";
import { MarketingDashboardClient } from "@/components/admin/marketing/MarketingDashboardClient";
import { isAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getMarketingData(userId: string) {
  const accounts = await prisma.marketingAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Add token status
  const accountsWithStatus = accounts.map((account) => ({
    ...account,
    tokenStatus: account.expiresAt && new Date(account.expiresAt) < new Date()
      ? ("expired" as const)
      : ("valid" as const),
  }));

  // Count by platform
  const facebookAccounts = accountsWithStatus.filter(
    (a) => a.platform === "FACEBOOK",
  );
  const googleAdsAccounts = accountsWithStatus.filter(
    (a) => a.platform === "GOOGLE_ADS",
  );

  return {
    accounts: accountsWithStatus,
    summary: {
      totalAccounts: accounts.length,
      facebookAccounts: facebookAccounts.length,
      googleAdsAccounts: googleAdsAccounts.length,
      expiredTokens: accountsWithStatus.filter((a) => a.tokenStatus === "expired")
        .length,
    },
  };
}

export default async function AdminMarketingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const isAdmin = await isAdminByUserId(session.user.id);
  if (!isAdmin) {
    redirect("/");
  }

  const data = await getMarketingData(session.user.id);

  return <MarketingDashboardClient initialData={data} />;
}
