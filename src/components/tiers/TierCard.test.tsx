import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TierCard, type TierInfo } from "./TierCard";

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

describe("TierCard", () => {
  describe("rendering", () => {
    it("renders tier display name in title", () => {
      render(<TierCard tier={mockBasicTier} />);
      // Display name appears in both TierBadge and CardTitle
      expect(screen.getAllByText("Basic").length).toBeGreaterThanOrEqual(1);
    });

    it("renders free price correctly", () => {
      render(<TierCard tier={mockFreeTier} />);
      // "Free" appears in both TierBadge and price display
      expect(screen.getAllByText("Free").length).toBeGreaterThanOrEqual(1);
    });

    it("renders paid price with currency symbol", () => {
      render(<TierCard tier={mockBasicTier} />);
      expect(screen.getByText("£5")).toBeInTheDocument();
      expect(screen.getByText("/month")).toBeInTheDocument();
    });

    it("renders well capacity", () => {
      render(<TierCard tier={mockStandardTier} />);
      expect(screen.getByText("50 tokens")).toBeInTheDocument();
      expect(screen.getByText("Well capacity")).toBeInTheDocument();
    });

    it("renders tier badge", () => {
      render(<TierCard tier={mockPremiumTier} />);
      expect(screen.getByTestId("tier-badge")).toBeInTheDocument();
    });

    it("renders features list", () => {
      render(<TierCard tier={mockPremiumTier} />);
      expect(screen.getByText("100 tokens capacity")).toBeInTheDocument();
      expect(screen.getByText("All features included")).toBeInTheDocument();
    });

    it("has correct data-testid", () => {
      render(<TierCard tier={mockBasicTier} />);
      expect(screen.getByTestId("tier-card-BASIC")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<TierCard tier={mockFreeTier} className="custom-class" />);
      expect(screen.getByTestId("tier-card-FREE")).toHaveClass("custom-class");
    });
  });

  describe("current tier", () => {
    it("shows current plan badge when isCurrent is true", () => {
      render(<TierCard tier={mockBasicTier} isCurrent />);
      expect(screen.getByTestId("current-tier-badge")).toBeInTheDocument();
      expect(screen.getByText("Current Plan")).toBeInTheDocument();
    });

    it("does not show current plan badge when isCurrent is false", () => {
      render(<TierCard tier={mockBasicTier} isCurrent={false} />);
      expect(screen.queryByTestId("current-tier-badge")).not
        .toBeInTheDocument();
    });

    it("shows current plan indicator when no actions available", () => {
      render(<TierCard tier={mockBasicTier} isCurrent />);
      expect(screen.getByTestId("current-plan-indicator")).toBeInTheDocument();
      expect(screen.getByText("Your current plan")).toBeInTheDocument();
    });

    it("applies highlighted variant when isCurrent", () => {
      render(<TierCard tier={mockBasicTier} isCurrent />);
      const card = screen.getByTestId("tier-card-BASIC");
      expect(card).toHaveClass("ring-2", "ring-primary");
    });
  });

  describe("next tier recommendation", () => {
    it("shows recommended badge when isNext is true", () => {
      render(<TierCard tier={mockStandardTier} isNext />);
      expect(screen.getByTestId("next-tier-badge")).toBeInTheDocument();
      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("does not show recommended badge when isNext is false", () => {
      render(<TierCard tier={mockStandardTier} isNext={false} />);
      expect(screen.queryByTestId("next-tier-badge")).not.toBeInTheDocument();
    });

    it("does not show recommended badge when isCurrent and isNext are both true", () => {
      render(<TierCard tier={mockStandardTier} isCurrent isNext />);
      expect(screen.queryByTestId("next-tier-badge")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-tier-badge")).toBeInTheDocument();
    });
  });

  describe("upgrade functionality", () => {
    it("shows upgrade button when canUpgrade is true and onUpgrade provided", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard tier={mockBasicTier} canUpgrade onUpgrade={onUpgrade} />,
      );
      expect(screen.getByTestId("upgrade-button")).toBeInTheDocument();
      expect(screen.getByText("Upgrade to Basic")).toBeInTheDocument();
    });

    it("does not show upgrade button when canUpgrade is false", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard
          tier={mockBasicTier}
          canUpgrade={false}
          onUpgrade={onUpgrade}
        />,
      );
      expect(screen.queryByTestId("upgrade-button")).not.toBeInTheDocument();
    });

    it("does not show upgrade button when onUpgrade is not provided", () => {
      render(<TierCard tier={mockBasicTier} canUpgrade />);
      expect(screen.queryByTestId("upgrade-button")).not.toBeInTheDocument();
    });

    it("calls onUpgrade when upgrade button is clicked", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard tier={mockBasicTier} canUpgrade onUpgrade={onUpgrade} />,
      );

      fireEvent.click(screen.getByTestId("upgrade-button"));
      expect(onUpgrade).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when isUpgrading is true", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard
          tier={mockBasicTier}
          canUpgrade
          onUpgrade={onUpgrade}
          isUpgrading
        />,
      );

      // Button has aria-busy when loading
      expect(screen.getByTestId("upgrade-button")).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });

    it("disables upgrade button when isUpgrading", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard
          tier={mockBasicTier}
          canUpgrade
          onUpgrade={onUpgrade}
          isUpgrading
        />,
      );

      expect(screen.getByTestId("upgrade-button")).toBeDisabled();
    });
  });

  describe("downgrade functionality", () => {
    it("shows downgrade button when canDowngrade is true and onDowngrade provided", () => {
      const onDowngrade = vi.fn();
      render(
        <TierCard tier={mockFreeTier} canDowngrade onDowngrade={onDowngrade} />,
      );
      expect(screen.getByTestId("downgrade-button")).toBeInTheDocument();
      expect(screen.getByText("Downgrade to Free")).toBeInTheDocument();
    });

    it("does not show downgrade button when canDowngrade is false", () => {
      const onDowngrade = vi.fn();
      render(
        <TierCard
          tier={mockFreeTier}
          canDowngrade={false}
          onDowngrade={onDowngrade}
        />,
      );
      expect(screen.queryByTestId("downgrade-button")).not.toBeInTheDocument();
    });

    it("does not show downgrade button when onDowngrade is not provided", () => {
      render(<TierCard tier={mockFreeTier} canDowngrade />);
      expect(screen.queryByTestId("downgrade-button")).not.toBeInTheDocument();
    });

    it("calls onDowngrade when downgrade button is clicked", () => {
      const onDowngrade = vi.fn();
      render(
        <TierCard tier={mockFreeTier} canDowngrade onDowngrade={onDowngrade} />,
      );

      fireEvent.click(screen.getByTestId("downgrade-button"));
      expect(onDowngrade).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when isScheduling is true", () => {
      const onDowngrade = vi.fn();
      render(
        <TierCard
          tier={mockFreeTier}
          canDowngrade
          onDowngrade={onDowngrade}
          isScheduling
        />,
      );

      // Button has aria-busy when loading
      expect(screen.getByTestId("downgrade-button")).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });

    it("disables downgrade button when isScheduling", () => {
      const onDowngrade = vi.fn();
      render(
        <TierCard
          tier={mockFreeTier}
          canDowngrade
          onDowngrade={onDowngrade}
          isScheduling
        />,
      );

      expect(screen.getByTestId("downgrade-button")).toBeDisabled();
    });
  });

  describe("combined actions", () => {
    it("can show both upgrade and downgrade buttons", () => {
      const onUpgrade = vi.fn();
      const onDowngrade = vi.fn();
      render(
        <TierCard
          tier={mockStandardTier}
          canUpgrade
          canDowngrade
          onUpgrade={onUpgrade}
          onDowngrade={onDowngrade}
        />,
      );

      expect(screen.getByTestId("upgrade-button")).toBeInTheDocument();
      expect(screen.getByTestId("downgrade-button")).toBeInTheDocument();
    });

    it("does not show current plan indicator when actions are available", () => {
      const onUpgrade = vi.fn();
      render(
        <TierCard
          tier={mockBasicTier}
          isCurrent
          canUpgrade
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.queryByTestId("current-plan-indicator")).not
        .toBeInTheDocument();
    });
  });

  describe("all tier types", () => {
    it.each([
      [mockFreeTier, "FREE"],
      [mockBasicTier, "BASIC"],
      [mockStandardTier, "STANDARD"],
      [mockPremiumTier, "PREMIUM"],
    ])("renders %s tier correctly", (tier, expectedTier) => {
      render(<TierCard tier={tier} />);
      expect(screen.getByTestId(`tier-card-${expectedTier}`))
        .toBeInTheDocument();
      // Display name appears in both badge and title
      expect(screen.getAllByText(tier.displayName).length)
        .toBeGreaterThanOrEqual(1);
    });
  });

  describe("tier features", () => {
    it("renders FREE tier features", () => {
      render(<TierCard tier={mockFreeTier} />);
      expect(screen.getByText("100 tokens capacity")).toBeInTheDocument();
      expect(screen.getByText("Daily regeneration")).toBeInTheDocument();
      expect(screen.getByText("Basic support")).toBeInTheDocument();
    });

    it("renders BASIC tier features", () => {
      render(<TierCard tier={mockBasicTier} />);
      expect(screen.getByText("20 tokens capacity")).toBeInTheDocument();
      expect(screen.getByText("Priority queue")).toBeInTheDocument();
    });

    it("renders STANDARD tier features", () => {
      render(<TierCard tier={mockStandardTier} />);
      expect(screen.getByText("50 tokens capacity")).toBeInTheDocument();
      expect(screen.getByText("Advanced features")).toBeInTheDocument();
    });

    it("renders PREMIUM tier features", () => {
      render(<TierCard tier={mockPremiumTier} />);
      expect(screen.getByText("Early access to new features"))
        .toBeInTheDocument();
      expect(screen.getByText("24/7 priority support")).toBeInTheDocument();
    });
  });
});
