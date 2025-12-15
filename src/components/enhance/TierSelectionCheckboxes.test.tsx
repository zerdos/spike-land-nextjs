import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type EnhancementTierType, TierSelectionCheckboxes } from "./TierSelectionCheckboxes";

describe("TierSelectionCheckboxes Component", () => {
  const mockOnSelectionChange = vi.fn();

  const defaultProps = {
    selectedTiers: [] as EnhancementTierType[],
    onSelectionChange: mockOnSelectionChange,
    userBalance: 20,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all three tier checkboxes", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      expect(screen.getByTestId("tier-checkbox-TIER_1K")).toBeInTheDocument();
      expect(screen.getByTestId("tier-checkbox-TIER_2K")).toBeInTheDocument();
      expect(screen.getByTestId("tier-checkbox-TIER_4K")).toBeInTheDocument();
    });

    it("displays tier names correctly", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      expect(screen.getByText("1K")).toBeInTheDocument();
      expect(screen.getByText("2K")).toBeInTheDocument();
      expect(screen.getByText("4K")).toBeInTheDocument();
    });

    it("displays tier resolutions correctly", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      expect(screen.getByText("1024px")).toBeInTheDocument();
      expect(screen.getByText("2048px")).toBeInTheDocument();
      expect(screen.getByText("4096px")).toBeInTheDocument();
    });

    it("displays tier costs correctly", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      const costElements = screen.getAllByText(/^\d+$/);
      const costs = costElements.map((el) => el.textContent);
      expect(costs).toContain("2");
      expect(costs).toContain("5");
      expect(costs).toContain("10");
    });

    it("renders the total cost section", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      expect(screen.getByTestId("total-cost-section")).toBeInTheDocument();
      expect(screen.getByText("Total Cost")).toBeInTheDocument();
    });

    it("shows user available balance", () => {
      render(<TierSelectionCheckboxes {...defaultProps} userBalance={50} />);

      expect(screen.getByText("/ 50 available")).toBeInTheDocument();
    });
  });

  describe("Selection functionality", () => {
    it("calls onSelectionChange when a tier is selected", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      const checkbox = screen.getByTestId("tier-checkbox-TIER_1K");
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(["TIER_1K"]);
    });

    it("calls onSelectionChange when a tier is deselected", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_1K", "TIER_2K"]}
        />,
      );

      const checkbox = screen.getByTestId("tier-checkbox-TIER_1K");
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(["TIER_2K"]);
    });

    it("allows selecting multiple tiers", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_1K"]}
        />,
      );

      const checkbox = screen.getByTestId("tier-checkbox-TIER_2K");
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        "TIER_1K",
        "TIER_2K",
      ]);
    });

    it("shows checkboxes as checked when selected", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_1K", "TIER_4K"]}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");

      expect(checkbox1K).toHaveAttribute("data-state", "checked");
      expect(checkbox2K).toHaveAttribute("data-state", "unchecked");
      expect(checkbox4K).toHaveAttribute("data-state", "checked");
    });
  });

  describe("Total cost calculation", () => {
    it("shows 0 total cost when no tiers selected", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      expect(screen.getByTestId("total-cost-value")).toHaveTextContent("0");
    });

    it("calculates total cost for single tier", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_2K"]}
        />,
      );

      expect(screen.getByTestId("total-cost-value")).toHaveTextContent("5");
    });

    it("calculates total cost for multiple tiers", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_1K", "TIER_2K", "TIER_4K"]}
        />,
      );

      expect(screen.getByTestId("total-cost-value")).toHaveTextContent("17");
    });

    it("calculates total cost correctly for TIER_1K and TIER_4K", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_1K", "TIER_4K"]}
        />,
      );

      expect(screen.getByTestId("total-cost-value")).toHaveTextContent("12");
    });
  });

  describe("Affordability checks", () => {
    it("disables tiers user cannot afford", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={3}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");

      expect(checkbox1K).not.toBeDisabled();
      expect(checkbox2K).toBeDisabled();
      expect(checkbox4K).toBeDisabled();
    });

    it("shows insufficient label for unaffordable tiers", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={3}
        />,
      );

      const insufficientLabels = screen.getAllByText("(Insufficient)");
      expect(insufficientLabels.length).toBe(2);
    });

    it("disables additional tiers when total would exceed balance", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={10}
          selectedTiers={["TIER_2K"]}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");

      expect(checkbox1K).not.toBeDisabled();
      expect(checkbox2K).not.toBeDisabled();
      expect(checkbox4K).toBeDisabled();
    });

    it("allows deselecting already selected tiers even if balance is low", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={5}
          selectedTiers={["TIER_2K"]}
        />,
      );

      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      expect(checkbox2K).not.toBeDisabled();

      fireEvent.click(checkbox2K);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe("Balance warning", () => {
    it("shows warning when total exceeds balance", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={10}
          selectedTiers={["TIER_1K", "TIER_2K", "TIER_4K"]}
        />,
      );

      expect(screen.getByTestId("balance-warning-message")).toBeInTheDocument();
      expect(screen.getByText("Total cost exceeds your available balance"))
        .toBeInTheDocument();
    });

    it("does not show warning when total is within balance", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={20}
          selectedTiers={["TIER_1K", "TIER_2K"]}
        />,
      );

      expect(screen.queryByTestId("balance-warning-message")).not
        .toBeInTheDocument();
    });

    it("shows warning icon in total cost section when exceeds balance", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={5}
          selectedTiers={["TIER_2K", "TIER_4K"]}
        />,
      );

      expect(screen.getByTestId("balance-warning-icon")).toBeInTheDocument();
    });

    it("does not show warning icon when within balance", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={20}
          selectedTiers={["TIER_2K"]}
        />,
      );

      expect(screen.queryByTestId("balance-warning-icon")).not
        .toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    it("disables all checkboxes when disabled prop is true", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          disabled={true}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");

      expect(checkbox1K).toBeDisabled();
      expect(checkbox2K).toBeDisabled();
      expect(checkbox4K).toBeDisabled();
    });

    it("disables already selected tiers when disabled prop is true", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          disabled={true}
          selectedTiers={["TIER_2K"]}
        />,
      );

      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      expect(checkbox2K).toBeDisabled();
    });

    it("does not call onSelectionChange when disabled", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          disabled={true}
        />,
      );

      const checkbox = screen.getByTestId("tier-checkbox-TIER_1K");
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe("Visual states", () => {
    it("applies selected styling to selected tier rows", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          selectedTiers={["TIER_2K"]}
        />,
      );

      const selectedRow = screen.getByTestId("tier-row-TIER_2K");
      expect(selectedRow).toHaveClass("border-primary");
    });

    it("applies default styling to unselected tier rows", () => {
      render(<TierSelectionCheckboxes {...defaultProps} />);

      const unselectedRow = screen.getByTestId("tier-row-TIER_1K");
      expect(unselectedRow).toHaveClass("border-border");
    });

    it("applies opacity to disabled rows", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={3}
        />,
      );

      const disabledRow = screen.getByTestId("tier-row-TIER_4K");
      expect(disabledRow).toHaveClass("opacity-50");
    });
  });

  describe("Edge cases", () => {
    it("handles zero balance correctly", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={0}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      const checkbox2K = screen.getByTestId("tier-checkbox-TIER_2K");
      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");

      expect(checkbox1K).toBeDisabled();
      expect(checkbox2K).toBeDisabled();
      expect(checkbox4K).toBeDisabled();
    });

    it("handles exact balance match", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={2}
        />,
      );

      const checkbox1K = screen.getByTestId("tier-checkbox-TIER_1K");
      expect(checkbox1K).not.toBeDisabled();
    });

    it("handles selecting all tiers when balance is sufficient", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={17}
          selectedTiers={["TIER_1K", "TIER_2K"]}
        />,
      );

      const checkbox4K = screen.getByTestId("tier-checkbox-TIER_4K");
      expect(checkbox4K).not.toBeDisabled();

      fireEvent.click(checkbox4K);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([
        "TIER_1K",
        "TIER_2K",
        "TIER_4K",
      ]);
    });

    it("correctly updates total when all tiers selected", () => {
      render(
        <TierSelectionCheckboxes
          {...defaultProps}
          userBalance={17}
          selectedTiers={["TIER_1K", "TIER_2K", "TIER_4K"]}
        />,
      );

      expect(screen.getByTestId("total-cost-value")).toHaveTextContent("17");
    });
  });
});
