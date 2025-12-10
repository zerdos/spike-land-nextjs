import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TokensPage from "./page";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock useTokenBalance hook
vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: vi.fn(() => ({
    balance: 50,
    isLoading: false,
    stats: {
      totalSpent: 100,
      totalEarned: 150,
      totalRefunded: 10,
      transactionCount: 25,
    },
    estimatedEnhancements: {
      tier1K: 25,
      tier2K: 10,
      tier4K: 5,
    },
    refetch: vi.fn(),
  })),
}));

// Mock VoucherInput component
vi.mock("@/components/tokens/VoucherInput", () => ({
  VoucherInput: ({ onRedeemed }: { onRedeemed?: () => void; }) => (
    <div data-testid="voucher-input">
      <button onClick={() => onRedeemed?.()}>Mock Redeem</button>
    </div>
  ),
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
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
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
    expect(mockRouter.push).toHaveBeenCalledWith("/auth/signin?callbackUrl=/tokens");
  });

  it("should render page for authenticated users", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Token Management")).toBeInTheDocument();
  });

  it("should display current token balance", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    // Use getAllByText since "50" appears multiple times (in balance and package estimates)
    const balanceElements = screen.getAllByText("50");
    expect(balanceElements.length).toBeGreaterThan(0);
    expect(screen.getByText("tokens available")).toBeInTheDocument();
  });

  it("should display estimated enhancements", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
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

  it("should display token stats", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Total Spent")).toBeInTheDocument();
    expect(screen.getByText("Total Earned")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    // Stats values are rendered - use getAllBy since they may appear in other places
    expect(screen.getAllByText("100 tokens").length).toBeGreaterThan(0); // totalSpent
  });

  it("should display voucher input", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByTestId("voucher-input")).toBeInTheDocument();
    expect(screen.getByText("Redeem Voucher")).toBeInTheDocument();
  });

  it("should display token packages", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Purchase Tokens")).toBeInTheDocument();
    expect(screen.getByTestId("token-packages-grid")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-starter")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-basic")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("package-card-power")).toBeInTheDocument();
  });

  it("should show popular badge on pro package", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
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
        user: { name: "Test User", email: "test@example.com" },
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
        user: { name: "Test User", email: "test@example.com" },
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

  it("should display token usage guide", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Token Costs per Enhancement")).toBeInTheDocument();
    expect(screen.getByText("1K Enhancement")).toBeInTheDocument();
    expect(screen.getByText("2K Enhancement")).toBeInTheDocument();
    expect(screen.getByText("4K Enhancement")).toBeInTheDocument();
  });

  it("should render with loading state", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
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
        user: { name: "Test User", email: "test@example.com" },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TokensPage />);
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });
});
