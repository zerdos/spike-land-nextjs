import { createFetchMock, mockCampaignsData } from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignsTab } from "./CampaignsTab";

// Mock the response structure expected by the component
const mockResponse = {
  campaigns: mockCampaignsData.map((c) => ({
    ...c,
    visitors: 1000,
    signups: 50,
    conversionRate: 5.0,
    revenue: 500,
  })),
  total: 2,
  page: 1,
  pageSize: 10,
};

describe("CampaignsTab", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/analytics/campaigns": mockResponse,
    }));

    // Mock URL methods for CSV export
    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders campaigns table with data", async () => {
    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Campaign Performance")).toBeInTheDocument();
      expect(screen.getByText("Test Campaign 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Campaign 2")).toBeInTheDocument();
    expect(screen.getAllByText("1,000").length).toBeGreaterThan(0); // Visitors
  });

  it("handles sorting", async () => {
    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Test Campaign 1")).toBeInTheDocument();
    });

    // Click on Visitors header to sort
    const visitorsHeader = screen.getByText("Visitors");
    fireEvent.click(visitorsHeader);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sortField=visitors"),
      );
    });
  });

  it("exports CSV", async () => {
    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });

    const exportBtn = screen.getByText("Export CSV");
    fireEvent.click(exportBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it("pagination controls render when needed", async () => {
    // Update mock to have more pages
    const manyPagesData = {
      campaigns: Array(11).fill(null).map((_, i) => ({
        id: `campaign-${i}`,
        name: `Campaign ${i}`,
        platform: "GOOGLE_ADS",
        visitors: 100,
        signups: 10,
        conversionRate: 10,
        revenue: 100,
      })),
      total: 50,
      pageSize: 10,
      page: 1,
    };

    global.fetch = vi.fn(createFetchMock({
      "/api/admin/marketing/analytics/campaigns": manyPagesData,
    }));

    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });
});
