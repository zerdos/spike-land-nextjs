import type {
  FacebookAdAccount,
  FacebookAdCampaignResponse,
  FacebookAdSet,
  FacebookAdSetResponse,
  FacebookCampaign,
  FacebookInsights,
  FacebookInsightsResponse,
} from "./types";

const GRAPH_API_VERSION = "v20.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class FacebookMarketingApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async facebookRequest<
    T extends { data: any[]; paging?: { next?: string; }; },
  >(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T["data"]> {
    let allData: T["data"] = [];
    let url: URL | null = new URL(`${GRAPH_API_BASE}/${path}`);
    url.searchParams.set("access_token", this.accessToken);
    for (const key in params) {
      const value = params[key];
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    while (url) {
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Facebook Marketing API request failed: ${
            errorData.error?.message || response.statusText
          }`,
        );
      }
      const page = (await response.json()) as T;
      if (page.data) {
        allData.push(...page.data);
      }
      url = page.paging?.next ? new URL(page.paging.next) : null;
    }

    return allData;
  }

  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    return await this.facebookRequest<{ data: FacebookAdAccount[]; }>(
      "me/adaccounts",
      {
        fields: "account_id,name",
      },
    );
  }

  async getCampaigns(adAccountId: string): Promise<FacebookCampaign[]> {
    return await this.facebookRequest<FacebookAdCampaignResponse>(
      `act_${adAccountId}/campaigns`,
      {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,budget_remaining",
        limit: "100",
      },
    );
  }

  async getAdSets(campaignId: string): Promise<FacebookAdSet[]> {
    return await this.facebookRequest<FacebookAdSetResponse>(
      `${campaignId}/adsets`,
      {
        fields: "id,name,status,daily_budget,lifetime_budget,bid_strategy",
        limit: "100",
      },
    );
  }

  async getInsights(objectId: string): Promise<FacebookInsights | null> {
    const response = await this.facebookRequest<FacebookInsightsResponse>(
      `${objectId}/insights`,
      {
        fields: "spend,impressions,clicks",
        date_preset: "maximum",
      },
    );

    return response?.[0] || null;
  }
}
