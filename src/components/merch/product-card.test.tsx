/**
 * Tests for ProductCard component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./product-card";

const mockProduct = {
  id: "prod_123",
  name: "Custom Postcard",
  description: "A beautiful custom postcard with your photo",
  retailPrice: 19.99,
  currency: "GBP",
  mockupTemplate: "https://example.com/mockup.jpg",
  category: {
    name: "Postcards",
    slug: "postcards",
  },
};

describe("ProductCard", () => {
  it("should render product name", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Custom Postcard")).toBeInTheDocument();
  });

  it("should render product description", () => {
    render(<ProductCard product={mockProduct} />);
    expect(
      screen.getByText("A beautiful custom postcard with your photo"),
    ).toBeInTheDocument();
  });

  it("should render formatted price", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("£19.99")).toBeInTheDocument();
  });

  it("should render category badge", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Postcards")).toBeInTheDocument();
  });

  it("should link to product detail page", () => {
    render(<ProductCard product={mockProduct} />);
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/merch/prod_123")).toBe(
      true,
    );
  });

  it("should render Customize button", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByRole("link", { name: "Customize" })).toBeInTheDocument();
  });

  it("should display 'From' price when variants have different prices", () => {
    const productWithVariants = {
      ...mockProduct,
      variants: [
        { id: "v1", name: "Small", priceDelta: 0 },
        { id: "v2", name: "Large", priceDelta: 5 },
      ],
    };

    render(<ProductCard product={productWithVariants} />);
    expect(screen.getByText("From £19.99")).toBeInTheDocument();
  });

  it("should not display 'From' when all variants have same price", () => {
    const productWithVariants = {
      ...mockProduct,
      variants: [
        { id: "v1", name: "Option A", priceDelta: 0 },
        { id: "v2", name: "Option B", priceDelta: 0 },
      ],
    };

    render(<ProductCard product={productWithVariants} />);
    expect(screen.getByText("£19.99")).toBeInTheDocument();
    expect(screen.queryByText("From £19.99")).not.toBeInTheDocument();
  });

  it("should render mockup image when available", () => {
    render(<ProductCard product={mockProduct} />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("alt", "Custom Postcard");
  });

  it("should render placeholder when no mockup", () => {
    const productWithoutMockup = {
      ...mockProduct,
      mockupTemplate: null,
    };

    render(<ProductCard product={productWithoutMockup} />);
    // Placeholder emoji should be rendered
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("should handle product without description", () => {
    const productWithoutDesc = {
      ...mockProduct,
      description: null,
    };

    render(<ProductCard product={productWithoutDesc} />);
    expect(screen.getByText("Custom Postcard")).toBeInTheDocument();
  });

  it("should format EUR currency correctly", () => {
    const euroProduct = {
      ...mockProduct,
      currency: "EUR",
    };

    render(<ProductCard product={euroProduct} />);
    expect(screen.getByText("€19.99")).toBeInTheDocument();
  });
});
