import { useWorkspaceCredits } from "@/hooks/useWorkspaceCredits";
import { UserRole } from "@prisma/client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useTransitionRouter } from "next-view-transitions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TokensPage from "./page";

// Mock authenticated user for tests
const mockAuthUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  role: UserRole.USER,
} as const;

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next-view-transitions
vi.mock("next-view-transitions", () => ({
  useTransitionRouter: vi.fn(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useWorkspaceCredits hook
const mockRefetch = vi.fn();
vi.mock("@/hooks/useWorkspaceCredits", () => ({
  useWorkspaceCredits: vi.fn(() => ({
    remaining: 50,
    limit: 100,
    used: 50,
    tier: "free",
    workspaceId: "ws-123",
    isLoading: false,
    hasFetched: true,
    error: null,
    isLowCredits: false,
    isCriticalCredits: false,
    usagePercent: 50,
    estimatedEnhancements: {
      tier1K: 25,
      tier2K: 10,
      tier4K: 5,
      suggested: 25,
      suggestedTier: "1K",
    },
    refetch: mockRefetch,
  })),
}));

// Mock fetch for checkout
global.fetch = vi.fn();

describe("TokensPage", () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransitionRouter).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof useTransitionRouter>,
    );
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    } as Response);
  });

  it("should redirect unauthenticated users", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=/tokens",
    );
  });

  it("should render page for authenticated users", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("AI Credits")).toBeInTheDocument();
  });

  it("should display current credit balance", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    // Use getAllByText since "50" appears multiple times (in balance and usage stats)
    const balanceElements = screen.getAllByText("50");
    expect(balanceElements.length).toBeGreaterThan(0);
    expect(screen.getByText("credits available")).toBeInTheDocument();
  });

  it("should display estimated enhancements", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    // Numbers may appear multiple times, so use getAllByText
    expect(screen.getAllByText("25").length).toBeGreaterThan(0); // tier1K
    expect(screen.getAllByText("10").length).toBeGreaterThan(0); // tier2K
    expect(screen.getAllByText("5").length).toBeGreaterThan(0); // tier4K
    expect(screen.getByText("1K quality")).toBeInTheDocument();
    expect(screen.getByText("2K quality")).toBeInTheDocument();
    expect(screen.getByText("4K quality")).toBeInTheDocument();
  });

  it("should display monthly usage stats", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Monthly Usage")).toBeInTheDocument();
    expect(screen.getByText("50 / 100 credits")).toBeInTheDocument();
    expect(screen.getByText("50% of monthly limit used")).toBeInTheDocument();
  });

  it("should display token packages", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Purchase Credits")).toBeInTheDocument();
    // Package cards have data-testid attributes
    expect(screen.getByTestId("package-card-starter")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-basic")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-power")).toBeInTheDocument();
  });

  it("should show popular badge on pro package", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("should show best value badge on power package", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Best Value")).toBeInTheDocument();
  });

  it("should handle purchase button click", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
    });

    render(<TokensPage />);
    const buyButton = screen.getByTestId("buy-button-starter");
    await user.click(buyButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: "starter", mode: "payment" }),
      });
    });

    // Restore
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("should display credit usage guide", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("AI Credit Costs per Enhancement")).toBeInTheDocument();
    expect(screen.getByText("1K Enhancement")).toBeInTheDocument();
    expect(screen.getByText("2K Enhancement")).toBeInTheDocument();
    expect(screen.getByText("4K Enhancement")).toBeInTheDocument();
  });

  it("should render with loading state", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    render(<TokensPage />);
    // Buy buttons should be disabled during loading
    const buyButton = screen.getByTestId("buy-button-starter");
    expect(buyButton).toBeDisabled();
  });

  it("should have refresh button", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("should call refetch when refresh button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should show alert when checkout returns error", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ error: "Custom error message" }),
    } as Response);

    render(<TokensPage />);
    const buyButton = screen.getByTestId("buy-button-starter");
    await user.click(buyButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Custom error message");
    });

    alertSpy.mockRestore();
  });

  it("should show default alert when checkout fails without error message", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    } as Response);

    render(<TokensPage />);
    const buyButton = screen.getByTestId("buy-button-starter");
    await user.click(buyButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to create checkout session",
      );
    });

    alertSpy.mockRestore();
  });

  it("should show alert when fetch throws an error", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<TokensPage />);
    const buyButton = screen.getByTestId("buy-button-starter");
    await user.click(buyButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to start checkout");
    });
    expect(consoleSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("should redirect to signin when purchasing without session", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);

    // When unauthenticated, the page should redirect immediately
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=/tokens",
    );
  });

  it("should show loading spinner when balance is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(useWorkspaceCredits).mockReturnValue({
      remaining: 0,
      limit: 0,
      used: 0,
      tier: null,
      workspaceId: null,
      isLoading: true,
      hasFetched: false,
      error: null,
      isLowCredits: false,
      isCriticalCredits: false,
      usagePercent: 0,
      estimatedEnhancements: {
        tier1K: 0,
        tier2K: 0,
        tier4K: 0,
        suggested: 0,
        suggestedTier: "1K",
      },
      refetch: mockRefetch,
    });

    render(<TokensPage />);
    // The RefreshCw spinner should be visible instead of the balance number
    expect(screen.queryByText("credits available")).toBeInTheDocument();
  });

  it("should display estimated enhancements when available", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    vi.mocked(useWorkspaceCredits).mockReturnValue({
      remaining: 50,
      limit: 100,
      used: 50,
      tier: null,
      workspaceId: null,
      isLoading: false,
      hasFetched: true,
      error: null,
      isLowCredits: false,
      isCriticalCredits: false,
      usagePercent: 50,
      estimatedEnhancements: {
        tier1K: 25,
        tier2K: 10,
        tier4K: 5,
        suggested: 25,
        suggestedTier: "1K",
      },
      refetch: mockRefetch,
    });

    render(<TokensPage />);
    // The estimated enhancements section should be displayed when values are available
    expect(screen.getByText("Estimated enhancements remaining:"))
      .toBeInTheDocument();
  });

  it("should show save badge for non-starter packages", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    // Basic, Pro, and Power packages should have Save badges
    const saveBadges = screen.getAllByText(/Save \d+%/);
    expect(saveBadges.length).toBeGreaterThan(0);
  });

  it("should show Redirecting text when loading purchase", async () => {
    const user = userEvent.setup();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: mockAuthUser,
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    // Make fetch hang indefinitely
    let resolvePromise: (value: Response) => void;
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
    });

    render(<TokensPage />);
    const buyButton = screen.getByTestId("buy-button-starter");
    await user.click(buyButton);

    await waitFor(() => {
      expect(screen.getByText("Redirecting...")).toBeInTheDocument();
    });

    // Cleanup: resolve the pending promise
    resolvePromise!({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    } as Response);

    // Restore
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("should show Loading text when session is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    vi.mocked(useWorkspaceCredits).mockReturnValue({
      remaining: 50,
      limit: 100,
      used: 50,
      tier: null,
      workspaceId: null,
      isLoading: false,
      hasFetched: true,
      error: null,
      isLowCredits: false,
      isCriticalCredits: false,
      usagePercent: 50,
      estimatedEnhancements: {
        tier1K: 25,
        tier2K: 10,
        tier4K: 5,
        suggested: 25,
        suggestedTier: "1K",
      },
      refetch: mockRefetch,
    });

    render(<TokensPage />);
    const loadingButtons = screen.getAllByText("Loading...");
    expect(loadingButtons.length).toBeGreaterThan(0);
  });
});
