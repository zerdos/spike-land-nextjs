import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenBalanceDisplay } from "./TokenBalanceDisplay";

vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: vi.fn(),
  LOW_BALANCE_THRESHOLD: 10,
}));

const { useTokenBalance } = await import("@/hooks/useTokenBalance");

const defaultMockReturn = {
  balance: 25,
  tier: null as string | null,
  maxBalance: null as number | null,
  isLoading: false,
  error: null,
  isLowBalance: false,
  isCriticalBalance: false,
  lastRegeneration: null as Date | null,
  timeUntilNextRegeneration: null as string | null,
  stats: null,
  estimatedEnhancements: {
    tier1K: 25,
    tier2K: 12,
    tier4K: 5,
    suggested: 25,
    suggestedTier: "1K",
  },
  refetch: vi.fn() as () => Promise<void>,
};

describe("TokenBalanceDisplay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 0,
      isLoading: true,
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders loading state with coin icon", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 0,
      isLoading: true,
    });

    render(<TokenBalanceDisplay />);

    const loadingSection = screen.getByText("Loading...").parentElement;
    expect(loadingSection?.querySelector("svg")).toBeInTheDocument();
  });

  it("renders balance correctly", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("25 tokens")).toBeInTheDocument();
    expect(screen.getByText("Available balance")).toBeInTheDocument();
  });

  it("renders balance with coin icon", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 10,
      estimatedEnhancements: {
        tier1K: 10,
        tier2K: 5,
        tier4K: 2,
        suggested: 10,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    const balanceSection = screen.getByText("10 tokens").parentElement
      ?.parentElement;
    expect(balanceSection?.querySelector("svg")).toBeInTheDocument();
  });

  it("shows low balance warning when balance is less than 10 but not critical", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
      estimatedEnhancements: {
        tier1K: 7,
        tier2K: 3,
        tier4K: 1,
        suggested: 7,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByTestId("low-balance-warning")).toBeInTheDocument();
    expect(screen.getByText("Low balance")).toBeInTheDocument();
  });

  it("shows critical balance warning when balance is less than 5", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 3,
      isLowBalance: true,
      isCriticalBalance: true,
      estimatedEnhancements: {
        tier1K: 3,
        tier2K: 1,
        tier4K: 0,
        suggested: 3,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByTestId("low-balance-warning")).toBeInTheDocument();
    expect(screen.getByText("Very low balance")).toBeInTheDocument();
  });

  it("shows purchase CTA when balance is low", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
      estimatedEnhancements: {
        tier1K: 7,
        tier2K: 3,
        tier4K: 1,
        suggested: 7,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByTestId("purchase-cta")).toBeInTheDocument();
    expect(screen.getByText("Top Up Tokens")).toBeInTheDocument();
  });

  it("shows urgent purchase CTA when balance is critical", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 2,
      isLowBalance: true,
      isCriticalBalance: true,
      estimatedEnhancements: {
        tier1K: 2,
        tier2K: 1,
        tier4K: 0,
        suggested: 2,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("Get Tokens Now")).toBeInTheDocument();
  });

  it("does not show purchase CTA when balance is normal", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenBalanceDisplay />);

    expect(screen.queryByTestId("purchase-cta")).not.toBeInTheDocument();
  });

  it("shows estimated enhancements by default", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenBalanceDisplay />);

    expect(screen.getByTestId("estimated-enhancements")).toBeInTheDocument();
    expect(screen.getByText("Estimated enhancements remaining"))
      .toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument(); // tier1K
    expect(screen.getByText("12")).toBeInTheDocument(); // tier2K
    expect(screen.getByText("5")).toBeInTheDocument(); // tier4K
  });

  it("hides estimated enhancements when showEstimates is false", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenBalanceDisplay showEstimates={false} />);

    expect(screen.queryByTestId("estimated-enhancements")).not
      .toBeInTheDocument();
  });

  it("shows analytics when showAnalytics is true and stats available", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      stats: {
        totalSpent: 50,
        totalEarned: 100,
        totalRefunded: 5,
        transactionCount: 20,
      },
    });

    render(<TokenBalanceDisplay showAnalytics />);

    expect(screen.getByTestId("token-analytics")).toBeInTheDocument();
    expect(screen.getByText("Your token usage")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument(); // totalSpent
    expect(screen.getByText("+100")).toBeInTheDocument(); // totalEarned
    expect(screen.getByText("+5")).toBeInTheDocument(); // totalRefunded
  });

  it("hides analytics when showAnalytics is false", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      stats: {
        totalSpent: 50,
        totalEarned: 100,
        totalRefunded: 5,
        transactionCount: 20,
      },
    });

    render(<TokenBalanceDisplay showAnalytics={false} />);

    expect(screen.queryByTestId("token-analytics")).not.toBeInTheDocument();
  });

  it("hides refunded row when totalRefunded is 0", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      stats: {
        totalSpent: 50,
        totalEarned: 100,
        totalRefunded: 0,
        transactionCount: 20,
      },
    });

    render(<TokenBalanceDisplay showAnalytics />);

    expect(screen.queryByText("Refunded")).not.toBeInTheDocument();
  });

  it("shows balance progress bar in analytics", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      stats: {
        totalSpent: 50,
        totalEarned: 100,
        totalRefunded: 0,
        transactionCount: 20,
      },
    });

    render(<TokenBalanceDisplay showAnalytics />);

    expect(screen.getByTestId("balance-progress")).toBeInTheDocument();
  });

  it("shows correct balance when balance is zero", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 0,
      isLowBalance: true,
      isCriticalBalance: true,
      estimatedEnhancements: {
        tier1K: 0,
        tier2K: 0,
        tier4K: 0,
        suggested: 0,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("shows correct balance when balance is large", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 999,
      estimatedEnhancements: {
        tier1K: 999,
        tier2K: 499,
        tier4K: 199,
        suggested: 999,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("999 tokens")).toBeInTheDocument();
  });

  it("renders in a card component", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    const { container } = render(<TokenBalanceDisplay />);

    const cardElement = container.querySelector('[class*="rounded"]');
    expect(cardElement).toBeInTheDocument();
  });

  it("applies custom className", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    const { container } = render(
      <TokenBalanceDisplay className="custom-class" />,
    );

    const card = container.firstChild;
    expect(card).toHaveClass("custom-class");
  });

  it("applies border-destructive class when critical balance", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 2,
      isLowBalance: true,
      isCriticalBalance: true,
      estimatedEnhancements: {
        tier1K: 2,
        tier2K: 1,
        tier4K: 0,
        suggested: 2,
        suggestedTier: "1K",
      },
    });

    const { container } = render(<TokenBalanceDisplay />);

    const card = container.firstChild;
    expect(card).toHaveClass("border-destructive");
  });

  it("applies border-yellow-500 class when low but not critical balance", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
      estimatedEnhancements: {
        tier1K: 7,
        tier2K: 3,
        tier4K: 1,
        suggested: 7,
        suggestedTier: "1K",
      },
    });

    const { container } = render(<TokenBalanceDisplay />);

    const card = container.firstChild;
    expect(card).toHaveClass("border-yellow-500");
  });

  it("does not render error state when error occurs", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 0,
      error: new Error("Failed to fetch"),
      isLowBalance: true,
      isCriticalBalance: true,
      estimatedEnhancements: {
        tier1K: 0,
        tier2K: 0,
        tier4K: 0,
        suggested: 0,
        suggestedTier: "1K",
      },
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("applies className to loading state", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
    });

    const { container } = render(
      <TokenBalanceDisplay className="test-class" />,
    );

    expect(container.firstChild).toHaveClass("test-class");
  });
});
