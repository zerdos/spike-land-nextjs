import type { CampaignObjective, CampaignStatus } from "@/lib/marketing/types";

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  manager: boolean;
}

export interface GoogleAdsCampaignData {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  budgetAmount: number; // in cents
  budgetType: "DAILY" | "LIFETIME" | "UNKNOWN";
  currency: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GoogleAdsAdGroup {
  id: string;
  campaignId: string;
  name: string;
  status: CampaignStatus;
}

export interface GoogleAdsInsights {
  spend: number; // in cents
  impressions: number;
  clicks: number;
  conversions: number;
}
