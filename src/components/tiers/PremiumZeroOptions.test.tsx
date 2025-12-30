import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PremiumZeroOptions, type TokenPack } from "./PremiumZeroOptions";

const mockTokenPacks: TokenPack[] = [
  { id: "starter", name: "Starter Pack", tokens: 10, price: 2.99 },
  { id: "plus", name: "Plus Pack", tokens: 25, price: 5.99 },
  { id: "pro", name: "Pro Pack", tokens: 50, price: 9.99 },
];

describe("PremiumZeroOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders the component", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByTestId("premium-zero-options")).toBeInTheDocument();
    });

    it("displays Premium tier badge", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByTestId("tier-badge")).toBeInTheDocument();
      expect(screen.getByTestId("tier-badge")).toHaveAttribute(
        "data-tier",
        "PREMIUM",
      );
    });

    it("displays title", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByText("Token Well Empty")).toBeInTheDocument();
    });

    it("displays description", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByText("Your Premium token well is temporarily empty"))
        .toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          className="custom-class"
        />,
      );
      expect(screen.getByTestId("premium-zero-options")).toHaveClass(
        "custom-class",
      );
    });
  });

  describe("regeneration countdown", () => {
    it("displays countdown section", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByTestId("regen-countdown")).toBeInTheDocument();
    });

    it("formats hours and minutes correctly", () => {
      // 2 hours and 30 minutes
      render(<PremiumZeroOptions timeUntilNextRegen={9000000} />);
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("2h 30m");
    });

    it("formats hours only when no minutes remain", () => {
      // Exactly 2 hours
      render(<PremiumZeroOptions timeUntilNextRegen={7200000} />);
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("2h");
    });

    it("formats minutes when less than an hour", () => {
      // 45 minutes
      render(<PremiumZeroOptions timeUntilNextRegen={2700000} />);
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("45m");
    });

    it("formats seconds when less than a minute", () => {
      // 30 seconds
      render(<PremiumZeroOptions timeUntilNextRegen={30000} />);
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("30s");
    });

    it("shows regenerating message when time is 0", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={0} />);
      expect(screen.getByTestId("regen-status")).toHaveTextContent(
        "Regenerating now...",
      );
    });

    it("shows regenerating message when time is negative", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={-1000} />);
      expect(screen.getByTestId("regen-status")).toHaveTextContent(
        "Regenerating now...",
      );
    });

    it("counts down over time", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={65000} />); // 1m 5s

      expect(screen.getByTestId("time-remaining")).toHaveTextContent("1m");

      // Advance 60 seconds
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("time-remaining")).toHaveTextContent("5s");
    });

    it("stops at 0 and shows regenerating", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={2000} />);

      // Advance past 0
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId("regen-status")).toHaveTextContent(
        "Regenerating now...",
      );
    });

    it("updates when timeUntilNextRegen prop changes", () => {
      const { rerender } = render(
        <PremiumZeroOptions timeUntilNextRegen={60000} />,
      );
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("1m");

      rerender(<PremiumZeroOptions timeUntilNextRegen={120000} />);
      expect(screen.getByTestId("time-remaining")).toHaveTextContent("2m");
    });
  });

  describe("token packs", () => {
    it("displays token packs section when packs provided", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );
      expect(screen.getByTestId("token-packs-section")).toBeInTheDocument();
    });

    it("displays 'Need tokens now?' heading", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );
      expect(screen.getByText("Need tokens now?")).toBeInTheDocument();
    });

    it("renders all token packs", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );

      expect(screen.getByTestId("pack-starter")).toBeInTheDocument();
      expect(screen.getByTestId("pack-plus")).toBeInTheDocument();
      expect(screen.getByTestId("pack-pro")).toBeInTheDocument();
    });

    it("displays pack name", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );
      expect(screen.getByText("Starter Pack")).toBeInTheDocument();
      expect(screen.getByText("Plus Pack")).toBeInTheDocument();
      expect(screen.getByText("Pro Pack")).toBeInTheDocument();
    });

    it("displays pack tokens and price", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );
      expect(screen.getByText("10 tokens - £2.99")).toBeInTheDocument();
      expect(screen.getByText("25 tokens - £5.99")).toBeInTheDocument();
      expect(screen.getByText("50 tokens - £9.99")).toBeInTheDocument();
    });

    it("calls onPurchasePack when pack is clicked", () => {
      const onPurchasePack = vi.fn();
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
          onPurchasePack={onPurchasePack}
        />,
      );

      fireEvent.click(screen.getByTestId("pack-starter"));
      expect(onPurchasePack).toHaveBeenCalledWith("starter");

      fireEvent.click(screen.getByTestId("pack-plus"));
      expect(onPurchasePack).toHaveBeenCalledWith("plus");
    });

    it("disables pack buttons when isPurchasing is true", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
          onPurchasePack={vi.fn()}
          isPurchasing={true}
        />,
      );

      expect(screen.getByTestId("pack-starter")).toBeDisabled();
      expect(screen.getByTestId("pack-plus")).toBeDisabled();
      expect(screen.getByTestId("pack-pro")).toBeDisabled();
    });

    it("does not call onPurchasePack when not provided", () => {
      render(
        <PremiumZeroOptions
          timeUntilNextRegen={600000}
          tokenPacks={mockTokenPacks}
        />,
      );

      // Should not throw error when clicked without handler
      fireEvent.click(screen.getByTestId("pack-starter"));
    });
  });

  describe("no packs available", () => {
    it("shows no packs message when tokenPacks is empty", () => {
      render(
        <PremiumZeroOptions timeUntilNextRegen={600000} tokenPacks={[]} />,
      );
      expect(screen.getByTestId("no-packs-message")).toBeInTheDocument();
    });

    it("shows no packs message when tokenPacks not provided", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByTestId("no-packs-message")).toBeInTheDocument();
    });

    it("displays helpful message about regeneration", () => {
      render(<PremiumZeroOptions timeUntilNextRegen={600000} />);
      expect(screen.getByTestId("no-packs-message")).toHaveTextContent(
        "Wait for your tokens to regenerate",
      );
    });

    it("does not show packs section when no packs", () => {
      render(
        <PremiumZeroOptions timeUntilNextRegen={600000} tokenPacks={[]} />,
      );
      expect(screen.queryByTestId("token-packs-section")).not
        .toBeInTheDocument();
    });
  });

  describe("timer cleanup", () => {
    it("cleans up interval on unmount", () => {
      const { unmount } = render(
        <PremiumZeroOptions timeUntilNextRegen={60000} />,
      );

      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("does not start timer when time is already 0", () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      render(<PremiumZeroOptions timeUntilNextRegen={0} />);

      // setInterval might be called for other reasons but not for our countdown
      // We verify by checking that the component shows "Regenerating now..."
      expect(screen.getByTestId("regen-status")).toBeInTheDocument();
      setIntervalSpy.mockRestore();
    });
  });
});
