import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenBalanceDisplay } from "./TokenBalanceDisplay";

vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: vi.fn(),
}));

const { useTokenBalance } = await import("@/hooks/useTokenBalance");

describe("TokenBalanceDisplay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 0,
      isLoading: true,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders loading state with coin icon", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 0,
      isLoading: true,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    const loadingSection = screen.getByText("Loading...").parentElement;
    expect(loadingSection?.querySelector("svg")).toBeInTheDocument();
  });

  it("renders balance correctly", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 25,
      isLoading: false,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("25 tokens")).toBeInTheDocument();
    expect(screen.getByText("Available balance")).toBeInTheDocument();
  });

  it("renders balance with coin icon", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 10,
      isLoading: false,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    const balanceSection = screen.getByText("10 tokens").parentElement?.parentElement;
    expect(balanceSection?.querySelector("svg")).toBeInTheDocument();
  });

  it("shows low balance when balance is less than 5", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 3,
      isLoading: false,
      error: null,
      isLowBalance: true,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("3 tokens")).toBeInTheDocument();
  });

  it("shows normal balance when balance is 5 or more", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 5,
      isLoading: false,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("5 tokens")).toBeInTheDocument();
  });

  it("shows correct balance when balance is zero", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 0,
      isLoading: false,
      error: null,
      isLowBalance: true,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("shows correct balance when balance is large", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 999,
      isLoading: false,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("999 tokens")).toBeInTheDocument();
  });

  it("renders in a card component", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 10,
      isLoading: false,
      error: null,
      isLowBalance: false,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    const { container } = render(<TokenBalanceDisplay />);

    const cardElement = container.querySelector('[class*="rounded"]');
    expect(cardElement).toBeInTheDocument();
  });

  it("does not render error state when error occurs", () => {
    vi.mocked(useTokenBalance).mockReturnValue({
      balance: 0,
      isLoading: false,
      error: new Error("Failed to fetch"),
      isLowBalance: true,
      lastRegeneration: null,
      timeUntilNextRegeneration: null,
      refetch: vi.fn(),
    });

    render(<TokenBalanceDisplay />);

    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });
});
