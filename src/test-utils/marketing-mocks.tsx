import { vi } from "vitest";

// Common mock data
export const mockMarketingData = {
  accounts: [
    {
      id: "acc_1",
      platform: "FACEBOOK",
      accountId: "123456789",
      accountName: "Test FB Account",
      isActive: true,
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
      expiresAt: new Date("2023-12-31"),
      tokenStatus: "valid",
    },
    {
      id: "acc_2",
      platform: "GOOGLE_ADS",
      accountId: "987654321",
      accountName: "Test Google Account",
      isActive: true,
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
      expiresAt: null,
      tokenStatus: "valid",
    },
  ],
  summary: {
    totalAccounts: 2,
    facebookAccounts: 1,
    googleAdsAccounts: 1,
    expiredTokens: 0,
  },
};

export const mockOverviewData = {
  metrics: {
    visitors: 1000,
    visitorsChange: 10,
    signups: 50,
    signupsChange: 5,
    conversionRate: 5.0,
    conversionRateChange: 0.5,
    revenue: 5000,
    revenueChange: 100,
  },
  daily: [
    { date: "2023-01-01", visitors: 100, conversions: 5 },
    { date: "2023-01-02", visitors: 120, conversions: 6 },
  ],
  trafficSources: [
    { name: "Direct", value: 400 },
    { name: "Social", value: 300 },
    { name: "Search", value: 300 },
  ],
};

export const mockCampaignsData = {
  campaigns: [
    {
      id: "camp_1",
      name: "Campaign 1",
      platform: "FACEBOOK",
      visitors: 500,
      signups: 20,
      conversionRate: 4.0,
      revenue: 1000,
      status: "ACTIVE",
      objective: "CONVERSIONS",
      budgetAmount: 1000,
      budgetCurrency: "USD",
      budgetType: "DAILY",
    },
    {
      id: "camp_2",
      name: "Campaign 2",
      platform: "GOOGLE_ADS",
      visitors: 600,
      signups: 30,
      conversionRate: 5.0,
      revenue: 1500,
      status: "PAUSED",
      objective: "SALES",
      budgetAmount: 2000,
      budgetCurrency: "USD",
      budgetType: "DAILY",
    },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

export const mockFunnelData = {
  stages: [
    { name: "Visitors", count: 1000, conversionRate: 100, dropoffRate: 50 },
    { name: "Signups", count: 500, conversionRate: 50, dropoffRate: 40 },
    { name: "Purchases", count: 300, conversionRate: 60, dropoffRate: 0 },
  ],
  campaigns: [
    { id: "camp_1", name: "Campaign 1" },
  ],
};

// Helper for Fetch Mocks
export const createFetchMock = (responseMap: Record<string, any>) => {
  return vi.fn().mockImplementation((url) => {
    // Sort keys by length descending to match most specific path first
    const keys = Object.keys(responseMap).sort((a, b) => b.length - a.length);
    const matchingKey = keys.find(key => url.toString().includes(key));
    if (matchingKey) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseMap[matchingKey]),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    });
  });
};
