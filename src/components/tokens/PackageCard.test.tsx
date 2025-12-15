import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PackageCard } from "./PackageCard";

describe("PackageCard", () => {
  const defaultProps = {
    id: "test-package",
    name: "Test Package",
    tokens: 100,
    price: 9.99,
    currencySymbol: "£",
    onSelect: vi.fn(),
  };

  it("renders package name and tokens", () => {
    render(<PackageCard {...defaultProps} />);
    expect(screen.getByText("Test Package")).toBeInTheDocument();
    expect(screen.getByText("100 tokens")).toBeInTheDocument();
  });

  it("renders price with currency symbol", () => {
    render(<PackageCard {...defaultProps} />);
    expect(screen.getByText("£9.99")).toBeInTheDocument();
  });

  it("calculates and displays per-token price", () => {
    render(<PackageCard {...defaultProps} />);
    expect(screen.getByText("£0.100 per token")).toBeInTheDocument();
  });

  it('shows "Most Popular" badge when popular prop is true', () => {
    render(<PackageCard {...defaultProps} popular={true} />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it('does not show "Most Popular" badge when popular prop is false', () => {
    render(<PackageCard {...defaultProps} popular={false} />);
    expect(screen.queryByText("Most Popular")).not.toBeInTheDocument();
  });

  it('does not show "Most Popular" badge when popular prop is undefined', () => {
    render(<PackageCard {...defaultProps} />);
    expect(screen.queryByText("Most Popular")).not.toBeInTheDocument();
  });

  it("applies ring styling when popular", () => {
    const { container } = render(
      <PackageCard {...defaultProps} popular={true} />,
    );
    const card = container.querySelector('[class*="ring-2"]');
    expect(card).toBeInTheDocument();
  });

  it("calls onSelect with package id when Buy Now button is clicked", () => {
    const onSelect = vi.fn();
    render(<PackageCard {...defaultProps} onSelect={onSelect} />);

    const button = screen.getByText("Buy Now");
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledWith("test-package");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows "Processing..." and disables button when isLoading is true', () => {
    render(<PackageCard {...defaultProps} isLoading={true} />);

    const button = screen.getByText("Processing...");
    expect(button).toBeDisabled();
  });

  it('shows "Buy Now" and enables button when isLoading is false', () => {
    render(<PackageCard {...defaultProps} isLoading={false} />);

    const button = screen.getByText("Buy Now");
    expect(button).not.toBeDisabled();
  });

  it("enables button when isLoading is undefined", () => {
    render(<PackageCard {...defaultProps} />);

    const button = screen.getByText("Buy Now");
    expect(button).not.toBeDisabled();
  });

  it("formats price to 2 decimal places", () => {
    render(<PackageCard {...defaultProps} price={10} />);
    expect(screen.getByText("£10.00")).toBeInTheDocument();
  });

  it("formats per-token price to 3 decimal places", () => {
    render(<PackageCard {...defaultProps} tokens={50} price={9.99} />);
    expect(screen.getByText("£0.200 per token")).toBeInTheDocument();
  });

  it("handles different currency symbols", () => {
    render(<PackageCard {...defaultProps} currencySymbol="$" price={19.99} />);
    expect(screen.getByText("$19.99")).toBeInTheDocument();
    expect(screen.getByText("$0.200 per token")).toBeInTheDocument();
  });

  it("renders with all components present", () => {
    render(<PackageCard {...defaultProps} popular={true} />);

    expect(screen.getByText("Test Package")).toBeInTheDocument();
    expect(screen.getByText("100 tokens")).toBeInTheDocument();
    expect(screen.getByText("£9.99")).toBeInTheDocument();
    expect(screen.getByText("£0.100 per token")).toBeInTheDocument();
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Buy Now")).toBeInTheDocument();
  });
});
