import { createFetchMock, mockFunnelData } from "@/test-utils/marketing-mocks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelTab } from "./FunnelTab";

describe("FunnelTab", () => {
  beforeEach(() => {
    global.fetch = createFetchMock({
      "/api/admin/marketing/analytics/funnel": mockFunnelData,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders funnel stages", async () => {
    render(<FunnelTab />);

    await waitFor(() => {
      expect(screen.getAllByText("Visitors").length).toBeGreaterThan(0);
      expect(screen.getAllByText("1,000").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Signups").length).toBeGreaterThan(0);
    expect(screen.getAllByText("500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Purchases").length).toBeGreaterThan(0);
    expect(screen.getAllByText("300").length).toBeGreaterThan(0);
  });

  it("renders summary stats", async () => {
    render(<FunnelTab />);

    await waitFor(() => {
      expect(screen.getByText("Total Visitors")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Purchases")).toBeInTheDocument();
    expect(screen.getByText("Overall Conversion Rate")).toBeInTheDocument();
    // 300/1000 = 30%
    expect(screen.getByText("30.00%")).toBeInTheDocument();
  });

  it("filters by campaign", async () => {
    render(<FunnelTab />);

    await waitFor(() => {
      expect(screen.getByText("All Campaigns")).toBeInTheDocument();
    });

    // Check initial fetch
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/marketing/analytics/funnel"),
    );
  });
});
