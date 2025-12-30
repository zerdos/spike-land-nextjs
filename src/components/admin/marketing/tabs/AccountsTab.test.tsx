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
  beforeEach(() => {
    global.fetch = createFetchMock({
      "/api/admin/marketing/campaigns": mockCampaignsData,
      "/api/admin/marketing/accounts": { success: true },
    });

    // Mock confirm dialog
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders connected accounts", () => {
    render(<AccountsTab />);

    expect(screen.getByText("Test FB Account")).toBeInTheDocument();
    expect(screen.getByText("Test Google Account")).toBeInTheDocument();
  });

  it("renders summary cards", () => {
    render(<AccountsTab />);
    expect(screen.getByText("Total Accounts")).toBeInTheDocument();
  });

  it("fetches and renders campaigns list", async () => {
    render(<AccountsTab />);

    await waitFor(() => {
      expect(screen.getByText("Campaign 1")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/admin/marketing/campaigns");
  });

  it("handles account disconnection", async () => {
    render(<AccountsTab />);

    // Find the account row
    const accountName = screen.getByText("Test FB Account");
    const accountRow = accountName.closest(
      "div.flex.items-center.justify-between",
    );
    expect(accountRow).toBeInTheDocument();

    // Find the delete button within that row
    const deleteBtn = accountRow!.querySelector("button");
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn!);

    expect(global.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/marketing/accounts",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(mockRefreshAccounts).toHaveBeenCalled();
    });
  });
});
