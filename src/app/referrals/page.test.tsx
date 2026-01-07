import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReferralsPage from "./page";

// Mock fetch
global.fetch = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock window.open
global.window.open = vi.fn();

describe("ReferralsPage", () => {
  const mockLinkData = {
    code: "ABC12345",
    url: "http://localhost:3000?ref=ABC12345",
  };

  const mockStatsData = {
    stats: {
      totalReferrals: 10,
      completedReferrals: 8,
      pendingReferrals: 2,
      tokensEarned: 400,
    },
    referredUsers: [
      {
        id: "ref-1",
        email: "j***@example.com",
        status: "COMPLETED",
        createdAt: "2024-01-01T00:00:00.000Z",
        tokensGranted: 50,
      },
      {
        id: "ref-2",
        email: "a***@test.com",
        status: "PENDING",
        createdAt: "2024-01-02T00:00:00.000Z",
        tokensGranted: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinkData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render loading state initially", () => {
    const { container } = render(<ReferralsPage />);
    // Check for skeleton elements (they have animate-pulse class)
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should display referral link and stats after loading", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Referral Program")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    expect(screen.getByDisplayValue(mockLinkData.url)).toBeTruthy();
    expect(screen.getByText(mockLinkData.code)).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy(); // Total referrals
    expect(screen.getByText("8")).toBeTruthy(); // Completed
    // "2" appears multiple times, so use getAllByText
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // Pending
    expect(screen.getByText("400")).toBeTruthy(); // Tokens earned
  });

  it("should display referred users in table", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("j***@example.com")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText("a***@test.com")).toBeTruthy();
    expect(screen.getAllByText("COMPLETED")).toBeTruthy();
    expect(screen.getAllByText("PENDING")).toBeTruthy();
  });

  it("should copy referral link to clipboard", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Copy")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const copyButton = screen.getByText("Copy");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockLinkData.url,
      );
    });

    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("should open Twitter share dialog", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Share on Twitter")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const twitterButton = screen.getByText("Share on Twitter");
    fireEvent.click(twitterButton);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should open Facebook share dialog", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Share on Facebook")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const facebookButton = screen.getByText("Share on Facebook");
    fireEvent.click(facebookButton);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("facebook.com/sharer"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should open LinkedIn share dialog", async () => {
    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Share on LinkedIn")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const linkedinButton = screen.getByText("Share on LinkedIn");
    fireEvent.click(linkedinButton);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("linkedin.com/sharing"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("should render without crashing on fetch failure", async () => {
    // Test that component handles errors gracefully without crashing
    vi.clearAllMocks();
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    let container: HTMLElement;
    await act(async () => {
      const result = render(<ReferralsPage />);
      container = result.container;
    });

    // Wait for error state to settle
    await waitFor(() => {
      expect(container!).toBeTruthy();
    });
  });

  it("should render with zero referrals", async () => {
    vi.clearAllMocks();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinkData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            tokensEarned: 0,
          },
          referredUsers: [],
        }),
      } as Response);

    const { container } = render(<ReferralsPage />);

    // Wait for component to finish loading
    await waitFor(
      () => {
        expect(container.querySelector(".container")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // Verify it shows 0 for stats
    await waitFor(() => {
      const stats = container.querySelectorAll(".text-3xl.font-bold");
      expect(stats.length).toBeGreaterThan(0);
    });
  });

  it("should render without crashing on API errors", async () => {
    // Test that component handles API errors gracefully
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    let container: HTMLElement;
    await act(async () => {
      const result = render(<ReferralsPage />);
      container = result.container;
    });

    // Wait for error state to settle
    await waitFor(() => {
      expect(container!).toBeTruthy();
    });
  });

  it("should handle clipboard copy errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("Clipboard error"),
    );

    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Copy")).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const copyButton = screen.getByText("Copy");
    fireEvent.click(copyButton);

    // Should not throw error, just log to console
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to copy:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("should display error when fetching referral link fails", async () => {
    vi.resetAllMocks();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Failed to fetch referral link")).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it("should display error when fetching referral stats fails", async () => {
    vi.resetAllMocks();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLinkData,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Stats error" }),
      } as Response);

    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Failed to fetch referral stats")).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it("should display fallback error message for non-Error exceptions", async () => {
    vi.resetAllMocks();
    vi.mocked(fetch).mockRejectedValueOnce("string error");

    render(<ReferralsPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Failed to load referral data")).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
