/**
 * Tests for VariantSelector component
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VariantSelector } from "./variant-selector";

const mockVariants = [
  { id: "v1", name: "Small", priceDelta: 0 },
  { id: "v2", name: "Medium", priceDelta: 5 },
  { id: "v3", name: "Large", priceDelta: 10 },
];

const mockVariantsWithAttributes = [
  { id: "v1", name: "Red/Small", priceDelta: 0, attributes: { color: "Red", size: "Small" } },
  { id: "v2", name: "Red/Large", priceDelta: 5, attributes: { color: "Red", size: "Large" } },
  { id: "v3", name: "Blue/Small", priceDelta: 0, attributes: { color: "Blue", size: "Small" } },
  { id: "v4", name: "Blue/Large", priceDelta: 5, attributes: { color: "Blue", size: "Large" } },
];

describe("VariantSelector", () => {
  it("should render nothing when no variants", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VariantSelector
        variants={[]}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render simple variant list", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("should display total price for each variant", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );

    // Small: £20.00
    expect(screen.getByText("£20.00")).toBeInTheDocument();
    // Medium: £25.00
    expect(screen.getByText("£25.00")).toBeInTheDocument();
    // Large: £30.00
    expect(screen.getByText("£30.00")).toBeInTheDocument();
  });

  it("should call onSelect when variant is clicked", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Medium"));

    expect(onSelect).toHaveBeenCalledWith(mockVariants[1]);
  });

  it("should highlight selected variant", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        basePrice={20}
        currency="GBP"
        selectedVariantId="v2"
        onSelect={onSelect}
      />,
    );

    // The Medium button should have the selected state
    const mediumButton = screen.getByText("Medium").closest("button");
    expect(mediumButton).toHaveClass("ring-2");
  });

  it("should display price for selected variant", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        basePrice={20}
        currency="GBP"
        selectedVariantId="v2"
        onSelect={onSelect}
      />,
    );

    // Medium is selected, showing £25.00 (20 + 5 delta)
    expect(screen.getByText("£25.00")).toBeInTheDocument();
  });

  it("should group variants by attribute", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariantsWithAttributes}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );

    // Should show attribute groups
    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("size")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("should format currency correctly", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={[{ id: "v1", name: "Test", priceDelta: 0 }]}
        basePrice={99.99}
        currency="EUR"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("€99.99")).toBeInTheDocument();
  });

  it("should show price delta for attributes with price difference", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={mockVariantsWithAttributes}
        basePrice={20}
        currency="GBP"
        onSelect={onSelect}
      />,
    );

    // Large has a +£5.00 delta
    expect(screen.getByText(/\+£5\.00/)).toBeInTheDocument();
  });
});
