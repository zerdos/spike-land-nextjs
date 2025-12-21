import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TierBadge } from "./TierBadge";

describe("TierBadge", () => {
  describe("rendering", () => {
    it("renders FREE tier correctly", () => {
      render(<TierBadge tier="FREE" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Free");
      expect(badge).toHaveAttribute("data-tier", "FREE");
    });

    it("renders BASIC tier correctly", () => {
      render(<TierBadge tier="BASIC" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Basic");
      expect(badge).toHaveAttribute("data-tier", "BASIC");
    });

    it("renders STANDARD tier correctly", () => {
      render(<TierBadge tier="STANDARD" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Standard");
      expect(badge).toHaveAttribute("data-tier", "STANDARD");
    });

    it("renders PREMIUM tier correctly", () => {
      render(<TierBadge tier="PREMIUM" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Premium");
      expect(badge).toHaveAttribute("data-tier", "PREMIUM");
    });
  });

  describe("tier normalization", () => {
    it("handles lowercase tier names", () => {
      render(<TierBadge tier="basic" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Basic");
      expect(badge).toHaveAttribute("data-tier", "BASIC");
    });

    it("handles mixed case tier names", () => {
      render(<TierBadge tier="Premium" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Premium");
      expect(badge).toHaveAttribute("data-tier", "PREMIUM");
    });

    it("defaults to FREE for invalid tier", () => {
      render(<TierBadge tier="INVALID" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Free");
      expect(badge).toHaveAttribute("data-tier", "FREE");
    });

    it("defaults to FREE for empty tier", () => {
      render(<TierBadge tier="" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveTextContent("Free");
      expect(badge).toHaveAttribute("data-tier", "FREE");
    });
  });

  describe("sizes", () => {
    it("renders small size correctly", () => {
      render(<TierBadge tier="FREE" size="sm" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("text-[10px]");
    });

    it("renders medium size correctly (default)", () => {
      render(<TierBadge tier="FREE" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("text-xs");
    });

    it("renders large size correctly", () => {
      render(<TierBadge tier="FREE" size="lg" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("text-sm");
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      render(<TierBadge tier="FREE" className="custom-class" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("custom-class");
    });

    it("applies blue styling for BASIC tier", () => {
      render(<TierBadge tier="BASIC" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("bg-blue-500/20");
      expect(badge).toHaveClass("text-blue-400");
    });

    it("applies purple styling for STANDARD tier", () => {
      render(<TierBadge tier="STANDARD" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("bg-purple-500/20");
      expect(badge).toHaveClass("text-purple-400");
    });

    it("applies amber styling for PREMIUM tier", () => {
      render(<TierBadge tier="PREMIUM" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("bg-amber-500/20");
      expect(badge).toHaveClass("text-amber-400");
    });

    it("applies muted styling for FREE tier", () => {
      render(<TierBadge tier="FREE" />);
      const badge = screen.getByTestId("tier-badge");
      expect(badge).toHaveClass("bg-muted/50");
      expect(badge).toHaveClass("text-muted-foreground");
    });
  });

  describe("showIcon", () => {
    it("does not show icon by default", () => {
      render(<TierBadge tier="PREMIUM" />);
      expect(screen.queryByText("★")).not.toBeInTheDocument();
    });

    it("shows star icon for PREMIUM when showIcon is true", () => {
      render(<TierBadge tier="PREMIUM" showIcon />);
      expect(screen.getByText("★")).toBeInTheDocument();
    });

    it("does not show icon for non-PREMIUM tiers even when showIcon is true", () => {
      render(<TierBadge tier="BASIC" showIcon />);
      expect(screen.queryByText("★")).not.toBeInTheDocument();
    });

    it("does not show icon for FREE tier when showIcon is true", () => {
      render(<TierBadge tier="FREE" showIcon />);
      expect(screen.queryByText("★")).not.toBeInTheDocument();
    });
  });
});
