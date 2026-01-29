import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookMarketingApiClient } from "./client";

describe("FacebookMarketingApiClient", () => {
  let client: FacebookMarketingApiClient;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    client = new FacebookMarketingApiClient(mockAccessToken);
    vi.clearAllMocks();

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("updateCampaignBudget", () => {
    it("should successfully update campaign budget", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000; // $50.00

      // Mock successful response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).resolves.toBeUndefined();

      // Verify the request
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall).toBeDefined();
      const url = new URL(fetchCall![0]);
      expect(url.pathname).toContain(campaignId);
      expect(url.searchParams.get("access_token")).toBe(mockAccessToken);
      expect(url.searchParams.get("daily_budget")).toBe(dailyBudgetCents.toString());
    });

    it("should handle rate limit errors (code 17)", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock rate limit response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 17,
            message: "User request limit reached",
          },
        }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/rate limit exceeded/i);
    });

    it("should handle rate limit errors (code 80004)", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock rate limit response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 80004,
            message: "There have been too many calls from this ad-account",
          },
        }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/rate limit exceeded/i);
    });

    it("should handle permission errors (code 200)", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock permission denied response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 200,
            message: "Permissions error",
          },
        }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/permission denied/i);
    });

    it("should handle permission errors (code 10)", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock permission denied response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 10,
            message: "Application does not have permission for this action",
          },
        }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/permission denied/i);
    });

    it("should convert budget to string format", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 12345; // $123.45

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await client.updateCampaignBudget(campaignId, dailyBudgetCents);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall).toBeDefined();
      const url = new URL(fetchCall![0]);
      expect(url.searchParams.get("daily_budget")).toBe("12345");
    });

    it("should handle generic API errors", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock generic error response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 999,
            message: "Something went wrong",
          },
        }),
      });

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/Facebook Marketing API mutation failed/);
    });

    it("should wrap errors with context", async () => {
      const campaignId = "123456789";
      const dailyBudgetCents = 5000;

      // Mock error that doesn't mention Facebook
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(
        client.updateCampaignBudget(campaignId, dailyBudgetCents),
      ).rejects.toThrow(/Facebook Ads budget update failed for campaign/);
    });
  });

  describe("facebookMutate", () => {
    it("should make POST request with body as query params", async () => {
      const campaignId = "123456789";

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Access private method through updateCampaignBudget
      await client.updateCampaignBudget(campaignId, 5000);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall).toBeDefined();
      const url = new URL(fetchCall![0]);

      // Verify POST method
      expect(fetchCall![1].method).toBe("POST");

      // Verify body params are in URL
      expect(url.searchParams.get("daily_budget")).toBe("5000");
      expect(url.searchParams.get("access_token")).toBe(mockAccessToken);
    });
  });
});
