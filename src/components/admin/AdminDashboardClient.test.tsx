/**
 * Tests for Admin Dashboard Client Component
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardClient, QuickLinkIcon } from "./AdminDashboardClient";

global.fetch = vi.fn();

// Polling interval is now 30 seconds (changed from 10 seconds for performance)
const POLLING_INTERVAL = 30000;

describe("AdminDashboardClient", () => {
  const mockInitialMetrics = {
    totalUsers: 100,
    adminCount: 5,
    totalEnhancements: 500,
    jobStatus: {
      pending: 10,
      processing: 5,
      completed: 480,
      failed: 5,
      active: 15,
    },
    totalTokensPurchased: 10000,
    totalTokensSpent: 8000,
    activeVouchers: 3,
    timestamp: "2025-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mock document.visibilityState to 'visible' by default
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render page title and description", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Platform overview and quick actions")).toBeInTheDocument();
  });

  it("should render metrics cards with initial values", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("5 admins")).toBeInTheDocument();
  });

  it("should render singular admin text when count is 1", () => {
    render(
      <AdminDashboardClient
        initialMetrics={{ ...mockInitialMetrics, adminCount: 1 }}
      />,
    );

    expect(screen.getByText("1 admin")).toBeInTheDocument();
  });

  it("should render enhancement metrics", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Enhancements")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("15 active jobs")).toBeInTheDocument();
  });

  it("should render singular active job text when count is 1", () => {
    render(
      <AdminDashboardClient
        initialMetrics={{
          ...mockInitialMetrics,
          jobStatus: { ...mockInitialMetrics.jobStatus, active: 1 },
        }}
      />,
    );

    expect(screen.getByText("1 active job")).toBeInTheDocument();
  });

  it("should render token metrics", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Tokens Purchased")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
    expect(screen.getByText("8,000 spent")).toBeInTheDocument();
  });

  it("should render voucher metrics", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Active Vouchers")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Promotional campaigns")).toBeInTheDocument();
  });

  it("should render real-time job status section", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Real-time Job Status")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("480")).toBeInTheDocument();
  });

  it("should render quick links", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("User Analytics")).toBeInTheDocument();
    expect(screen.getByText("Token Economics")).toBeInTheDocument();
    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Voucher Management")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Photo Gallery")).toBeInTheDocument();
  });

  it("should render Pause button and Live badge when polling is active", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByRole("button", { name: "Pause auto-refresh" })).toBeInTheDocument();
    expect(screen.getAllByText("Live")).toHaveLength(2);
  });

  it("should render Refresh button", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByRole("button", { name: "Refresh data" })).toBeInTheDocument();
  });

  it("should toggle polling when Pause/Resume button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const pauseButton = screen.getByRole("button", { name: "Pause auto-refresh" });
    await user.click(pauseButton);

    expect(screen.getByRole("button", { name: "Resume auto-refresh" })).toBeInTheDocument();
    expect(screen.queryAllByText("Live")).toHaveLength(0);

    const resumeButton = screen.getByRole("button", { name: "Resume auto-refresh" });
    await user.click(resumeButton);

    expect(screen.getByRole("button", { name: "Pause auto-refresh" })).toBeInTheDocument();
    expect(screen.getAllByText("Live")).toHaveLength(2);
  });

  it("should fetch new data when Refresh button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const updatedMetrics = {
      ...mockInitialMetrics,
      totalUsers: 150,
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedMetrics,
    } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const refreshButton = screen.getByRole("button", { name: "Refresh data" });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/dashboard");
      expect(screen.getByText("150")).toBeInTheDocument();
    });
  });

  it("should show Refreshing... text while refreshing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockInitialMetrics,
              } as Response),
            100,
          )
        ),
    );

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const refreshButton = screen.getByRole("button", { name: "Refresh data" });
    await user.click(refreshButton);

    expect(screen.getByText("Refreshing...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });
  });

  it("should poll for new data at regular intervals", async () => {
    const updatedMetrics = {
      ...mockInitialMetrics,
      totalUsers: 200,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => updatedMetrics,
    } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/dashboard");
    });
  });

  it("should not poll when polling is paused", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const pauseButton = screen.getByRole("button", { name: "Pause auto-refresh" });
    await user.click(pauseButton);

    vi.mocked(fetch).mockClear();

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL + 5000);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should display error message when fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it("should display error message when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.getByText("Error: Network error")).toBeInTheDocument();
    });
  });

  it("should clear error on successful fetch", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInitialMetrics,
      } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.getByText("Error: Network error")).toBeInTheDocument();
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  it("should update last updated time after fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInitialMetrics,
    } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const initialUpdateText = screen.getByText(/Last updated:/);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBe(initialUpdateText);
    });
  });

  it("should render all quick link icons", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
  });

  it("should have correct href for each quick link", () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    expect(screen.getByRole("link", { name: /User Analytics/i })).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
    expect(screen.getByRole("link", { name: /Token Economics/i })).toHaveAttribute(
      "href",
      "/admin/tokens",
    );
    expect(screen.getByRole("link", { name: /System Health/i })).toHaveAttribute(
      "href",
      "/admin/system",
    );
    expect(screen.getByRole("link", { name: /Voucher Management/i })).toHaveAttribute(
      "href",
      "/admin/vouchers",
    );
    expect(screen.getByRole("link", { name: /User Management/i })).toHaveAttribute(
      "href",
      "/admin/users",
    );
    expect(screen.getByRole("link", { name: /Photo Gallery/i })).toHaveAttribute(
      "href",
      "/admin/photos",
    );
  });

  it("should handle unknown error type", async () => {
    vi.mocked(fetch).mockRejectedValueOnce("Unknown error string");

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    await waitFor(() => {
      expect(screen.getByText("Error: Unknown error")).toBeInTheDocument();
    });
  });

  it("should not poll when tab is not visible", async () => {
    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    // Clear any initial fetches
    vi.mocked(fetch).mockClear();

    // Set visibility to hidden after initial render
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });

    // Dispatch visibility change event to trigger the effect
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL);
    });

    // Should not have polled since tab is hidden
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should refresh immediately when tab becomes visible", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockInitialMetrics,
    } as Response);

    render(<AdminDashboardClient initialMetrics={mockInitialMetrics} />);

    vi.mocked(fetch).mockClear();

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/dashboard");
    });
  });

  describe("QuickLinkIcon", () => {
    it("should return null for unknown icon type", () => {
      const { container } = render(<QuickLinkIcon icon="unknown-icon" />);
      expect(container.firstChild).toBeNull();
    });
  });
});
