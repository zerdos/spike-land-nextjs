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
    T extends { data: unknown[]; paging?: { next?: string; }; },
  >(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T["data"]> {
    const allData: T["data"] = [];
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

  /**
   * Make a mutation request (POST/DELETE) to Facebook Marketing API
   */
  private async facebookMutate(
    path: string,
    method: "POST" | "DELETE",
    body?: Record<string, unknown>,
  ): Promise<void> {
    const url = new URL(`${GRAPH_API_BASE}/${path}`);
    url.searchParams.set("access_token", this.accessToken);

    // Add body params to URL for POST (Facebook's convention)
    if (body && method === "POST") {
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      const errorCode = errorData.error?.code;

      // Handle specific error codes
      if (errorCode === 17 || errorCode === 80004) {
        throw new Error(
          `Facebook rate limit exceeded: ${errorMessage}`,
        );
      }

      if (errorCode === 200 || errorCode === 10) {
        throw new Error(
          `Permission denied. Check Facebook Ads account permissions: ${errorMessage}`,
        );
      }

      throw new Error(
        `Facebook Marketing API mutation failed: ${errorMessage}`,
      );
    }
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

  /**
   * Update campaign daily budget on Facebook Ads platform
   *
   * @param campaignId - The Facebook campaign ID
   * @param dailyBudgetCents - The new daily budget in cents
   * @throws Error if the update fails or permissions are insufficient
   */
  async updateCampaignBudget(
    campaignId: string,
    dailyBudgetCents: number,
  ): Promise<void> {
    try {
      await this.facebookMutate(
        campaignId,
        "POST",
        {
          daily_budget: dailyBudgetCents.toString(),
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw with context if not already wrapped
        if (!error.message.includes("Facebook")) {
          throw new Error(
            `Facebook Ads budget update failed for campaign ${campaignId}: ${error.message}`,
          );
        }
        throw error;
      }
      throw new Error(
        `Unknown error updating Facebook Ads budget for campaign ${campaignId}`,
      );
    }
  }
}
