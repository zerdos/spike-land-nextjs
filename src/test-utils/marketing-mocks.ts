/**
 * Marketing Test Mocks
 *
 * Mock data and utilities for marketing-related tests.
 */

export interface MockMarketingAccount {
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

export interface MockCampaign {
  id: string;
  name: string;
  status: string;
  platform: string;
  budget?: number;
  spend?: number;
}

export interface MockMarketingSummary {
  totalAccounts: number;
  facebookAccounts: number;
  googleAdsAccounts: number;
  expiredTokens: number;
}

export interface MockMarketingData {
  accounts: MockMarketingAccount[];
  summary: MockMarketingSummary;
  campaigns?: MockCampaign[];
}

export interface MockOverviewData {
  metrics: {
    visitors: number;
    visitorsChange: number;
    signups: number;
    signupsChange: number;
    conversionRate: number;
    conversionRateChange: number;
    revenue: number;
    revenueChange: number;
  };
  daily: Array<{
    date: string;
    visitors: number;
    conversions: number;
  }>;
  trafficSources: Array<{
    name: string;
    value: number;
  }>;
}

export interface MockFunnelData {
  stages: Array<{
    name: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
  }>;
}

const now = new Date();

export const mockMarketingData: MockMarketingData = {
  accounts: [
    {
      id: "account-1",
      platform: "GOOGLE_ADS",
      accountId: "ads-123",
      accountName: "Test Google Ads Account",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      tokenStatus: "valid",
    },
    {
      id: "account-2",
      platform: "FACEBOOK",
      accountId: "fb-456",
      accountName: "Test Meta Ads Account",
      isActive: true,
      createdAt: now,
      updatedAt: now,
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
  campaigns: [
    {
      id: "campaign-1",
      name: "Test Campaign 1",
      status: "active",
      platform: "GOOGLE_ADS",
      budget: 1000,
      spend: 500,
    },
  ],
};

export const mockCampaignsData: MockCampaign[] = [
  {
    id: "campaign-1",
    name: "Test Campaign 1",
    status: "active",
    platform: "GOOGLE_ADS",
    budget: 1000,
    spend: 500,
  },
  {
    id: "campaign-2",
    name: "Test Campaign 2",
    status: "paused",
    platform: "META_ADS",
    budget: 2000,
    spend: 1500,
  },
];

export const mockOverviewData: MockOverviewData = {
  metrics: {
    visitors: 1000,
    visitorsChange: 10,
    signups: 50,
    signupsChange: 5,
    conversionRate: 5.0,
    conversionRateChange: 0.5,
    revenue: 5000,
    revenueChange: 1000,
  },
  daily: [
    { date: "2023-01-01", visitors: 100, conversions: 5 },
    { date: "2023-01-02", visitors: 150, conversions: 8 },
  ],
  trafficSources: [
    { name: "Direct", value: 400 },
    { name: "Social", value: 300 },
    { name: "Organic", value: 300 },
  ],
};

export const mockFunnelData: MockFunnelData = {
  stages: [
    { name: "Visitors", count: 1000, conversionRate: 100, dropoffRate: 0 },
    { name: "Signups", count: 500, conversionRate: 50, dropoffRate: 50 },
    { name: "Purchases", count: 300, conversionRate: 60, dropoffRate: 40 },
  ],
  campaigns: [
    { id: "campaign-1", name: "Test Campaign 1" },
  ],
};

/**
 * Create a mock fetch function for testing.
 * @param responses Object mapping URLs to mock responses
 */
export function createFetchMock(
  responses: Record<string, unknown>,
): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    // Find matching response
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        } as Response);
      }
    }

    // console.warn(`Mock fetch 404 for URL: ${url}`); // Debugging help

    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
      text: () => Promise.resolve("Not found"),
    } as Response);
  }) as typeof globalThis.fetch;
}
