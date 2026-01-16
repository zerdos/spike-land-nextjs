import { GoogleAdsClient } from "@/lib/marketing/google-ads-client";
import type { CampaignStatus } from "@/lib/marketing/types";
import type {
  GoogleAdsAccount,
  GoogleAdsAdGroup,
  GoogleAdsCampaignData,
  GoogleAdsInsights,
} from "./types";

/**
 * Google Ads API query response types
 */
interface CustomerQueryResult {
  customer?: {
    currencyCode?: string;
    manager?: boolean;
  };
}

interface CustomerClientQueryResult {
  customerClient: {
    clientCustomer: string;
    descriptiveName?: string;
    currencyCode: string;
    manager: boolean;
  };
}

interface AdGroupQueryResult {
  adGroup: {
    id: string;
    name: string;
    status: string;
    campaign: string;
  };
}

interface MetricsQueryResult {
  metrics?: {
    costMicros: string;
    impressions: string;
    clicks: string;
    conversions: string;
  };
}

/**
 * Extended Google Ads client for budget allocation features
 */
class ExtendedGoogleAdsClient extends GoogleAdsClient {
  /**
   * Execute a typed GAQL query (exposes protected method)
   */
  async executeQuery<T>(customerId: string, gaqlQuery: string): Promise<T[]> {
    return this.query<T>(customerId, gaqlQuery);
  }
}

export class GoogleAdsAllocatorClient {
  private client: ExtendedGoogleAdsClient;

  constructor(accessToken: string, loginCustomerId?: string) {
    this.client = new ExtendedGoogleAdsClient({
      accessToken,
      customerId: loginCustomerId,
    });
  }

  /**
   * Get all accessible Google Ads accounts, including sub-accounts if it's an MCC.
   */
  async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    const accessibleCustomers = await this.client.getAccounts();
    const accounts: GoogleAdsAccount[] = [];

    for (const customer of accessibleCustomers) {
      // Check if it's a manager account
      const info = await this.getCustomerDetailedInfo(customer.accountId);

      accounts.push({
        id: customer.accountId,
        name: customer.accountName || "Unnamed Account",
        currency: info.currencyCode,
        manager: info.manager,
      });

      // If it's a manager account, we could recursively list sub-accounts
      // However, listAccessibleCustomers usually returns the top-level accounts.
      // For a more robust implementation, we search for client customers linked to this manager.
      if (info.manager) {
        const subAccounts = await this.getSubAccounts(customer.accountId);
        accounts.push(...subAccounts);
      }
    }

    // Remove duplicates by ID (in case sub-accounts are also returned by listAccessibleCustomers)
    return Array.from(new Map(accounts.map((a) => [a.id, a])).values());
  }

  private async getCustomerDetailedInfo(
    customerId: string,
  ): Promise<{ currencyCode: string; manager: boolean; }> {
    // GAQL to get detailed customer info
    const query = `SELECT customer.currency_code, customer.manager FROM customer LIMIT 1`;
    // We need to set the login-customer-id for this specific call
    this.client.setCustomerId(customerId);
    const results = await this.client.executeQuery<CustomerQueryResult>(
      customerId,
      query,
    );

    const firstResult = results[0];
    return {
      currencyCode: firstResult?.customer?.currencyCode || "USD",
      manager: firstResult?.customer?.manager || false,
    };
  }

  private async getSubAccounts(managerId: string): Promise<GoogleAdsAccount[]> {
    this.client.setCustomerId(managerId);
    // Request client customers linked to this manager
    const query = `
      SELECT
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.level <= 1
        AND customer_client.status = 'ENABLED'
        AND customer_client.manager = false
    `;
    const results = await this.client.executeQuery<CustomerClientQueryResult>(
      managerId,
      query,
    );

    return results.map((r) => ({
      id: r.customerClient.clientCustomer.replace("customers/", ""),
      name: r.customerClient.descriptiveName || "Unnamed Sub-account",
      currency: r.customerClient.currencyCode,
      manager: r.customerClient.manager,
    }));
  }

  async getCampaigns(customerId: string): Promise<GoogleAdsCampaignData[]> {
    const normalizedId = customerId.replace(/-/g, "");
    this.client.setCustomerId(normalizedId);

    // Using listCampaigns from the base client but mapping to our local type
    const campaigns = await this.client.listCampaigns(normalizedId);

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      budgetAmount: c.budgetAmount,
      budgetType: c.budgetType as GoogleAdsCampaignData["budgetType"],
      currency: c.budgetCurrency,
      startDate: c.startDate || undefined,
      endDate: c.endDate || undefined,
    }));
  }

  async getAdGroups(
    customerId: string,
    campaignId: string,
  ): Promise<GoogleAdsAdGroup[]> {
    const normalizedId = customerId.replace(/-/g, "");
    this.client.setCustomerId(normalizedId);

    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign
      FROM ad_group
      WHERE ad_group.campaign = 'customers/${normalizedId}/campaigns/${campaignId}'
        AND ad_group.status != 'REMOVED'
    `;

    const results = await this.client.executeQuery<AdGroupQueryResult>(
      normalizedId,
      query,
    );

    return results.map((r) => ({
      id: r.adGroup.id,
      campaignId: campaignId,
      name: r.adGroup.name,
      status: this.mapStatus(r.adGroup.status),
    }));
  }

  async getMetrics(
    customerId: string,
    objectId: string,
    level: "CAMPAIGN" | "AD_GROUP",
    startDate: Date,
    endDate: Date,
  ): Promise<GoogleAdsInsights> {
    const normalizedId = customerId.replace(/-/g, "");
    this.client.setCustomerId(normalizedId);

    const startStr = startDate.toISOString().split("T")[0]?.replace(/-/g, "") ||
      "";
    const endStr = endDate.toISOString().split("T")[0]?.replace(/-/g, "") || "";

    const resource = level === "CAMPAIGN" ? "campaign" : "ad_group";
    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM ${resource}
      WHERE ${resource}.id = ${objectId}
        AND segments.date BETWEEN '${startStr}' AND '${endStr}'
    `;

    const results = await this.client.executeQuery<MetricsQueryResult>(
      normalizedId,
      query,
    );
    const data = results[0]?.metrics ||
      { costMicros: "0", impressions: "0", clicks: "0", conversions: "0" };

    return {
      spend: Math.round(parseInt(data.costMicros) / 10000), // micros to cents
      impressions: parseInt(data.impressions),
      clicks: parseInt(data.clicks),
      conversions: parseFloat(data.conversions),
    };
  }

  private mapStatus(status: string): CampaignStatus {
    const statusMap: Record<string, CampaignStatus> = {
      ENABLED: "ACTIVE",
      PAUSED: "PAUSED",
      REMOVED: "DELETED",
    };
    return statusMap[status] || "UNKNOWN";
  }
}
