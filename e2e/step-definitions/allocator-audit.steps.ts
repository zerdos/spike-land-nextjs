import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Extend CustomWorld for allocator audit testing
declare module "../support/world" {
  interface CustomWorld {
    workspaceSlug?: string;
    mockCampaigns?: Map<string, { name: string; budget: number; id: string; }>;
    autopilotEnabledCampaigns?: Set<string>;
    mockAuditLogs?: Array<{
      id: string;
      type: string;
      trigger: string;
      outcome: string;
      campaignName: string;
      createdAt: string;
    }>;
  }
}

// Background Steps - Authentication and Workspace Setup
Given("I log in as a user", async function(this: CustomWorld) {
  await this.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "user-audit-test", name: "Audit Test User", email: "audit-test@example.com" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
});

Given("I switch to workspace {string}", async function(this: CustomWorld, workspaceName: string) {
  this.workspaceSlug = workspaceName.toLowerCase().replace(/\s+/g, "-");
});

// Campaign Setup Steps
Given(
  "I have a campaign {string} with budget {int}",
  async function(this: CustomWorld, campaignName: string, budget: number) {
    if (!this.mockCampaigns) this.mockCampaigns = new Map();
    const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.mockCampaigns.set(campaignName, { name: campaignName, budget, id: campaignId });
    await this.page.route("**/api/orbit/**/allocator/campaigns**", async (route) => {
      const campaigns = Array.from(this.mockCampaigns?.values() || []).map((c) => ({
        id: c.id,
        name: c.name,
        budget: c.budget,
        platform: "FACEBOOK_ADS",
        status: "ACTIVE",
        lastSyncAt: new Date().toISOString(),
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ campaigns }),
      });
    });
  },
);

// Autopilot Setup Steps
Given(
  "I have enabled autopilot for {string}",
  async function(this: CustomWorld, campaignName: string) {
    if (!this.autopilotEnabledCampaigns) this.autopilotEnabledCampaigns = new Set();
    this.autopilotEnabledCampaigns.add(campaignName);
    const campaign = this.mockCampaigns?.get(campaignName);
    await this.page.route("**/api/orbit/**/allocator/autopilot/config**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isEnabled: true,
          mode: "MODERATE",
          maxDailyBudgetChange: 10,
          maxSingleChange: 10,
          cooldownMinutes: 60,
          isEmergencyStopped: false,
          campaignId: campaign?.id || null,
        }),
      });
    });
  },
);

// Cron Job Trigger Step
When("I trigger the allocator autopilot cron job", async function(this: CustomWorld) {
  if (!this.mockAuditLogs) this.mockAuditLogs = [];
  const campaigns = this.mockCampaigns || new Map();
  const enabledCampaigns = this.autopilotEnabledCampaigns || new Set();
  for (const campaignName of Array.from(enabledCampaigns)) {
    const campaign = campaigns.get(campaignName);
    if (campaign) {
      this.mockAuditLogs.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: "RECOMMENDATION_GENERATED",
        trigger: "CRON",
        outcome: "EXECUTED",
        campaignName: campaign.name,
        createdAt: new Date().toISOString(),
      });
    }
  }
  await this.page.route("**/api/orbit/**/allocator/audit**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        auditLogs: this.mockAuditLogs?.map((log) => ({
          ...log,
          metadata: {
            budgetChange: 50,
            previousBudget: 1000,
            newBudget: 1050,
            reason: "Performance above threshold",
          },
        })) || [],
        pagination: { total: this.mockAuditLogs?.length || 0, page: 1, pageSize: 20 },
      }),
    });
  });
  await this.page.route("**/api/orbit/**/allocator/autopilot/cron**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        executionsTriggered: this.autopilotEnabledCampaigns?.size || 0,
      }),
    });
  });
});

// Navigation Steps
When("I navigate to the Allocator Audit page", async function(this: CustomWorld) {
  const workspaceSlug = this.workspaceSlug || "test-workspace";
  await this.page.goto(`/orbit/${workspaceSlug}/allocator/audit`);
});

// Assertion Steps
Then(
  "I should see an audit log entry for {string}",
  async function(this: CustomWorld, type: string) {
    await expect(this.page.getByText(type)).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the audit log trigger should be {string}",
  async function(this: CustomWorld, trigger: string) {
    await expect(this.page.getByText(trigger)).toBeVisible();
  },
);

Then(
  "the audit log outcome should be {string}",
  async function(this: CustomWorld, outcome: string) {
    await expect(this.page.getByText(outcome)).toBeVisible();
  },
);

// Filtering Steps
Given("I see the audit log table", async function(this: CustomWorld) {
  if (!this.mockAuditLogs || this.mockAuditLogs.length === 0) {
    this.mockAuditLogs = [
      {
        id: "audit-filter-1",
        type: "RECOMMENDATION_GENERATED",
        trigger: "CRON",
        outcome: "EXECUTED",
        campaignName: "Audit Campaign 1",
        createdAt: new Date().toISOString(),
      },
      {
        id: "audit-filter-2",
        type: "BUDGET_CHANGE",
        trigger: "MANUAL",
        outcome: "COMPLETED",
        campaignName: "Audit Campaign 2",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    await this.page.route("**/api/orbit/**/allocator/audit**", async (route) => {
      const url = new URL(route.request().url());
      const searchQuery = url.searchParams.get("search") || url.searchParams.get("q") || "";
      let filteredLogs = this.mockAuditLogs || [];
      if (searchQuery) {
        filteredLogs = filteredLogs.filter((log) =>
          log.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          auditLogs: filteredLogs.map((log) => ({
            ...log,
            metadata: {
              budgetChange: 50,
              previousBudget: 1000,
              newBudget: 1050,
              reason: "Performance above threshold",
            },
          })),
          pagination: { total: filteredLogs.length, page: 1, pageSize: 20 },
        }),
      });
    });
  }
  const workspaceSlug = this.workspaceSlug || "audit-workspace";
  await this.page.goto(`/orbit/${workspaceSlug}/allocator/audit`);
  await expect(this.page.locator("table")).toBeVisible({ timeout: 10000 });
});

When("I search for {string}", async function(this: CustomWorld, query: string) {
  const searchInput = this.page.getByPlaceholder("Search by Execution ID...");
  await searchInput.fill(query);
  await searchInput.press("Enter");
});

Then("I should see {string} in the results", async function(this: CustomWorld, content: string) {
  await expect(this.page.getByText(content)).toBeVisible();
});
