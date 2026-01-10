import {
  createFetchMock,
  mockCampaignsData,
  mockMarketingData,
} from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountsTab } from "./AccountsTab";

// Mock useMarketingData
const mockRefreshAccounts = vi.fn();
vi.mock("../MarketingLayout", () => ({
  useMarketingData: () => ({
    data: mockMarketingData,
    refreshAccounts: mockRefreshAccounts,
  }),
}));

describe("AccountsTab", () => {
  const originalFetch = global.fetch;
  const originalConfirm = global.confirm;

  beforeEach(() => {
    // We need to spy on fetch to be able to assert calls, but also provide implementation
    // The component expects a response format with { campaigns: [...] }
    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/campaigns": {
        campaigns: mockCampaignsData.map(c => ({
          ...c,
          status: "ACTIVE",
          objective: "CONVERSIONS",
          budgetAmount: 10000,
          budgetCurrency: "USD",
          budgetType: "DAILY"
        }))
      },
      "/api/admin/marketing/accounts": { success: true },
    }));

    // Mock confirm dialog
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.confirm = originalConfirm;
    vi.restoreAllMocks();
  });

  it("renders connected accounts", () => {
    render(<AccountsTab />);

    expect(screen.getByText("Test Meta Ads Account")).toBeInTheDocument();
    expect(screen.getByText("Test Google Ads Account")).toBeInTheDocument();
  });

  it("renders summary cards", () => {
    render(<AccountsTab />);
    expect(screen.getByText("Total Accounts")).toBeInTheDocument();
  });

  it("fetches and renders campaigns list", async () => {
    render(<AccountsTab />);

    await waitFor(() => {
      expect(screen.getByText("Test Campaign 1")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/admin/marketing/campaigns");
  });

  it("handles account disconnection", async () => {
    render(<AccountsTab />);

    // Find the account row
    const accountName = screen.getByText("Test Meta Ads Account");
    // Find the disconnect button - it is the button with Trash2 icon in the same row
    // We can use the container to scope the search
    const accountRow = accountName.closest("div.flex.items-center.justify-between");
    const deleteBtn = accountRow!.querySelector("button");

    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn!);

    expect(global.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/marketing/accounts"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(mockRefreshAccounts).toHaveBeenCalled();
    });
  });
});
