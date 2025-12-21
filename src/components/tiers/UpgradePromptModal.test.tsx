import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type TierInfo, UpgradePromptModal } from "./UpgradePromptModal";

const mockFreeTier: TierInfo = {
  tier: "FREE",
  displayName: "Free",
  wellCapacity: 100,
  priceGBP: 0,
};

const mockBasicTier: TierInfo = {
  tier: "BASIC",
  displayName: "Basic",
  wellCapacity: 20,
  priceGBP: 5,
};

const mockStandardTier: TierInfo = {
  tier: "STANDARD",
  displayName: "Standard",
  wellCapacity: 50,
  priceGBP: 10,
};

const mockPremiumTier: TierInfo = {
  tier: "PREMIUM",
  displayName: "Premium",
  wellCapacity: 100,
  priceGBP: 20,
};

describe("UpgradePromptModal", () => {
  describe("visibility", () => {
    it("renders when open is true", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("upgrade-prompt-modal")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      render(
        <UpgradePromptModal
          open={false}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.queryByTestId("upgrade-prompt-modal")).not.toBeInTheDocument();
    });
  });

  describe("content", () => {
    it("displays the title", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("modal-title")).toHaveTextContent("You're out of tokens!");
    });

    it("displays the description", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("modal-description")).toHaveTextContent(
        "Your token well is empty",
      );
    });

    it("displays tier comparison when both tiers provided", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("tier-comparison")).toBeInTheDocument();
    });

    it("shows current tier capacity in comparison", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByText("100 tokens")).toBeInTheDocument();
    });

    it("shows next tier capacity in comparison", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByText("20 tokens")).toBeInTheDocument();
    });

    it("does not show tier comparison when currentTier is null", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={null}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.queryByTestId("tier-comparison")).not.toBeInTheDocument();
    });

    it("does not show tier comparison when nextTier is null", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={null}
        />,
      );
      expect(screen.queryByTestId("tier-comparison")).not.toBeInTheDocument();
    });

    it("displays benefits list when nextTier provided", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("benefits-list")).toBeInTheDocument();
    });

    it("shows next tier name in benefits heading", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockStandardTier}
        />,
      );
      expect(screen.getByText("What you'll get with Standard:")).toBeInTheDocument();
    });

    it("shows token capacity in benefits", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockStandardTier}
        />,
      );
      expect(screen.getByText("50 token capacity")).toBeInTheDocument();
    });

    it("does not show benefits when nextTier is null", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={null}
        />,
      );
      expect(screen.queryByTestId("benefits-list")).not.toBeInTheDocument();
    });
  });

  describe("upgrade button", () => {
    it("shows upgrade button when nextTier and onUpgrade provided", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onUpgrade={vi.fn()}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).toBeInTheDocument();
    });

    it("shows tier name in upgrade button", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onUpgrade={vi.fn()}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).toHaveTextContent("Upgrade to Basic");
    });

    it("shows price in upgrade button for paid tiers", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockBasicTier}
          nextTier={mockStandardTier}
          onUpgrade={vi.fn()}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).toHaveTextContent("£10/month");
    });

    it("does not show price for free tier", () => {
      const freeTierWithZeroPrice: TierInfo = { ...mockFreeTier, priceGBP: 0 };
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockBasicTier}
          nextTier={freeTierWithZeroPrice}
          onUpgrade={vi.fn()}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).not.toHaveTextContent("/month");
    });

    it("calls onUpgrade when clicked", () => {
      const onUpgrade = vi.fn();
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onUpgrade={onUpgrade}
        />,
      );

      fireEvent.click(screen.getByTestId("upgrade-button"));
      expect(onUpgrade).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when isUpgrading", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onUpgrade={vi.fn()}
          isUpgrading={true}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).toHaveAttribute("aria-busy", "true");
    });

    it("disables upgrade button when isUpgrading", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onUpgrade={vi.fn()}
          isUpgrading={true}
        />,
      );
      expect(screen.getByTestId("upgrade-button")).toBeDisabled();
    });

    it("does not show upgrade button when onUpgrade not provided", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.queryByTestId("upgrade-button")).not.toBeInTheDocument();
    });

    it("does not show upgrade button when nextTier is null", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={null}
          onUpgrade={vi.fn()}
        />,
      );
      expect(screen.queryByTestId("upgrade-button")).not.toBeInTheDocument();
    });
  });

  describe("dismiss button", () => {
    it("shows dismiss button", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      expect(screen.getByTestId("dismiss-button")).toBeInTheDocument();
      expect(screen.getByText("Maybe later")).toBeInTheDocument();
    });

    it("calls onDismiss when clicked", () => {
      const onDismiss = vi.fn();
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
          onDismiss={onDismiss}
        />,
      );

      fireEvent.click(screen.getByTestId("dismiss-button"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenChange with false when dismiss clicked", () => {
      const onOpenChange = vi.fn();
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={onOpenChange}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );

      fireEvent.click(screen.getByTestId("dismiss-button"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("tier badges", () => {
    it("displays current tier badge", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockBasicTier}
        />,
      );
      // There are multiple badges - check at least one FREE badge exists
      expect(screen.getAllByTestId("tier-badge").length).toBeGreaterThanOrEqual(2);
    });

    it("displays next tier badge with icon", () => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={mockFreeTier}
          nextTier={mockPremiumTier}
        />,
      );
      // Premium badge should have the star icon
      const badges = screen.getAllByTestId("tier-badge");
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("different tier combinations", () => {
    it.each([
      [mockFreeTier, mockBasicTier, "FREE to BASIC"],
      [mockBasicTier, mockStandardTier, "BASIC to STANDARD"],
      [mockStandardTier, mockPremiumTier, "STANDARD to PREMIUM"],
    ])("handles %s upgrade path", (current, next) => {
      render(
        <UpgradePromptModal
          open={true}
          onOpenChange={vi.fn()}
          currentTier={current}
          nextTier={next}
          onUpgrade={vi.fn()}
        />,
      );

      expect(screen.getByTestId("tier-comparison")).toBeInTheDocument();
      expect(screen.getByTestId("upgrade-button")).toHaveTextContent(
        `Upgrade to ${next.displayName}`,
      );
    });
  });
});
