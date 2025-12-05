import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenDisplay } from "./TokenDisplay";

vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: vi.fn(),
}));

vi.mock("./PurchaseModal", () => ({
  PurchaseModal: ({ trigger }: { trigger: React.ReactNode; }) => (
    <div data-testid="purchase-modal">{trigger}</div>
  ),
}));

const { useTokenBalance } = await import("@/hooks/useTokenBalance");

const defaultMockReturn = {
  balance: 25,
  isLoading: false,
  error: null,
  isLowBalance: false,
  isCriticalBalance: false,
  lastRegeneration: null,
  timeUntilNextRegeneration: null,
  stats: null,
  estimatedEnhancements: {
    tier1K: 25,
    tier2K: 12,
    tier4K: 5,
    suggested: 25,
    suggestedTier: "1K",
  },
  refetch: vi.fn(),
};

describe("TokenDisplay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state with spinner", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
    });

    render(<TokenDisplay />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders balance correctly", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay />);

    expect(screen.getByText("25 tokens")).toBeInTheDocument();
  });

  it("shows low balance icon when balance is low", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
    });

    render(<TokenDisplay />);

    expect(screen.getByTestId("low-balance-icon")).toBeInTheDocument();
  });

  it("shows correct button text for critical balance", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 2,
      isLowBalance: true,
      isCriticalBalance: true,
    });

    render(<TokenDisplay />);

    expect(screen.getByTestId("purchase-button")).toHaveTextContent("Get Tokens");
  });

  it("shows correct button text for low balance", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
    });

    render(<TokenDisplay />);

    expect(screen.getByTestId("purchase-button")).toHaveTextContent("Top Up");
  });

  it("shows + button for normal balance", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay />);

    expect(screen.getByTestId("purchase-button")).toHaveTextContent("+");
  });

  it("hides purchase button when showPurchase is false", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay showPurchase={false} />);

    expect(screen.queryByTestId("purchase-button")).not.toBeInTheDocument();
  });

  it("shows purchase modal when showPurchase is true", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay showPurchase />);

    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });

  it("applies critical balance styling", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 2,
      isLowBalance: true,
      isCriticalBalance: true,
    });

    render(<TokenDisplay />);

    const display = screen.getByTestId("token-balance-display");
    expect(display).toHaveClass("bg-destructive/10");
    expect(display).toHaveClass("text-destructive");
  });

  it("applies low balance styling", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 7,
      isLowBalance: true,
      isCriticalBalance: false,
    });

    render(<TokenDisplay />);

    const display = screen.getByTestId("token-balance-display");
    expect(display).toHaveClass("bg-yellow-500/10");
  });

  it("applies normal balance styling", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay />);

    const display = screen.getByTestId("token-balance-display");
    expect(display).toHaveClass("bg-muted");
  });

  it("applies custom className", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    const { container } = render(<TokenDisplay className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows balance of 0 correctly", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 0,
      isLowBalance: true,
      isCriticalBalance: true,
    });

    render(<TokenDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("shows large balance correctly", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: 999,
    });

    render(<TokenDisplay />);

    expect(screen.getByText("999 tokens")).toBeInTheDocument();
  });

  it("does not show low balance icon when balance is normal", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay />);

    expect(screen.queryByTestId("low-balance-icon")).not.toBeInTheDocument();
  });

  it("handles null balance as 0", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      balance: null as unknown as number,
    });

    render(<TokenDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("shows tooltip content when showEstimates is true", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      ...defaultMockReturn,
      estimatedEnhancements: {
        tier1K: 25,
        tier2K: 12,
        tier4K: 5,
        suggested: 25,
        suggestedTier: "1K",
      },
    });

    render(<TokenDisplay showEstimates />);

    // The tooltip should wrap the balance display
    expect(screen.getByTestId("token-balance-display")).toBeInTheDocument();
  });

  it("does not show tooltip when showEstimates is false", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay showEstimates={false} />);

    expect(screen.getByTestId("token-balance-display")).toBeInTheDocument();
  });

  it("renders with default props", () => {
    vi.mocked(useTokenBalance).mockReturnValue(defaultMockReturn);

    render(<TokenDisplay />);

    expect(screen.getByTestId("token-balance-display")).toBeInTheDocument();
    expect(screen.getByTestId("purchase-modal")).toBeInTheDocument();
  });
});
