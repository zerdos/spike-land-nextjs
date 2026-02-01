/**
 * Admin Marketing Layout
 *
 * Shared layout for all marketing admin pages with authentication
 * and navigation tabs.
 */

import { auth } from "@/auth";
import { MarketingLayout } from "@/components/admin/marketing/MarketingLayout";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface ConnectedAccount {
  id: string;
  platform: "FACEBOOK" | "GOOGLE_ADS";
  accountId: string;
  accountName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  tokenStatus: "valid" | "expired";
}

interface MarketingData {
  accounts: ConnectedAccount[];
  summary: {
    totalAccounts: number;
    facebookAccounts: number;
    googleAdsAccounts: number;
    expiredTokens: number;
  };
}

async function getMarketingData(userId: string): Promise<MarketingData> {
  try {
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
  } catch (error) {
    console.error("Failed to fetch marketing data:", error);
    return {
      accounts: [],
      summary: {
        totalAccounts: 0,
        facebookAccounts: 0,
        googleAdsAccounts: 0,
        expiredTokens: 0,
      },
    };
  }
}

interface LayoutProps {
  children: ReactNode;
}

export default async function AdminMarketingLayout({ children }: LayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const isAdmin = await verifyAdminAccess(session);
  if (!isAdmin) {
    redirect("/");
  }

  const data = await getMarketingData(session.user.id);

  return <MarketingLayout initialData={data}>{children}</MarketingLayout>;
}
