import { createFetchMock, mockCampaignsData } from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignsTab } from "./CampaignsTab";

describe("CampaignsTab", () => {
  beforeEach(() => {
    global.fetch = createFetchMock({
      "/api/admin/marketing/analytics/campaigns": mockCampaignsData,
    });

    // Mock URL methods for CSV export
    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders campaigns table with data", async () => {
    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Campaign Performance")).toBeInTheDocument();
      expect(screen.getByText("Campaign 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Campaign 2")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument(); // Visitors for Camp 1
  });

  it("handles sorting", async () => {
    render(<CampaignsTab />);

    await waitFor(() => {
      expect(screen.getByText("Campaign 1")).toBeInTheDocument();
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
      ...mockCampaignsData,
      total: 50,
      pageSize: 10,
    };
    global.fetch = createFetchMock({
      "/api/admin/marketing/analytics/campaigns": manyPagesData,
    });

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
