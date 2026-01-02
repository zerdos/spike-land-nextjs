/**
 * Tests for Merch Storybook Page
 * Ensures merchandise components render correctly
 */

import { render } from "@testing-library/react-native";

import MerchPage from "../../../app/storybook/merch";

describe("MerchPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Merch")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Print-on-demand merchandise components"),
      ).toBeTruthy();
    });
  });

  describe("Product Cards section", () => {
    it("should render Product Cards section title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Product Cards")).toBeTruthy();
    });

    it("should render Product Cards description", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Display merchandise with images, variants, and pricing."),
      ).toBeTruthy();
    });

    it("should render spike.land Classic Tee product", () => {
      const { getAllByText } = render(<MerchPage />);
      const classicTees = getAllByText("spike.land Classic Tee");
      expect(classicTees.length).toBeGreaterThan(0);
      const prices = getAllByText("$29.99");
      expect(prices.length).toBeGreaterThan(0);
    });

    it("should render AI Spark Hoodie product", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("AI Spark Hoodie")).toBeTruthy();
      expect(getByText("$59.99")).toBeTruthy();
    });

    it("should render Dev Mode Cap product", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Dev Mode Cap")).toBeTruthy();
      expect(getByText("$24.99")).toBeTruthy();
    });

    it("should render Add to Cart buttons", () => {
      const { getAllByText } = render(<MerchPage />);
      const addToCartButtons = getAllByText("Add to Cart");
      expect(addToCartButtons.length).toBe(3);
    });

    it("should render size options", () => {
      const { getAllByText } = render(<MerchPage />);
      const sizeS = getAllByText("S");
      const sizeM = getAllByText("M");
      const sizeL = getAllByText("L");
      expect(sizeS.length).toBeGreaterThan(0);
      expect(sizeM.length).toBeGreaterThan(0);
      expect(sizeL.length).toBeGreaterThan(0);
    });
  });

  describe("Size Selector section", () => {
    it("should render Size Selector section title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Size Selector")).toBeTruthy();
    });

    it("should render Size Selector description", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Interactive size selection with availability indicators."),
      ).toBeTruthy();
    });

    it("should render Select Size label", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Select Size")).toBeTruthy();
    });

    it("should render all size buttons", () => {
      const { getAllByText } = render(<MerchPage />);
      const xsSizes = getAllByText("XS");
      expect(xsSizes.length).toBeGreaterThan(0);
      const xlSizes = getAllByText("XL");
      expect(xlSizes.length).toBeGreaterThan(0);
      const xxlSizes = getAllByText("XXL");
      expect(xxlSizes.length).toBeGreaterThan(0);
    });
  });

  describe("Color Picker section", () => {
    it("should render Color Picker section title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Color Picker")).toBeTruthy();
    });

    it("should render Color Picker description", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Variant selection with color swatches."),
      ).toBeTruthy();
    });

    it("should render current color label", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Color: Black")).toBeTruthy();
    });
  });

  describe("Quantity Selector section", () => {
    it("should render Quantity Selector section title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Quantity Selector")).toBeTruthy();
    });

    it("should render Quantity Selector description", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Increment/decrement controls for cart quantities."),
      ).toBeTruthy();
    });

    it("should render Quantity label", () => {
      const { getAllByText } = render(<MerchPage />);
      const quantityLabels = getAllByText("Quantity");
      expect(quantityLabels.length).toBeGreaterThan(0);
    });

    it("should render quantity value", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("1")).toBeTruthy();
    });
  });

  describe("Cart Summary section", () => {
    it("should render Cart Summary section title", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Cart Summary")).toBeTruthy();
    });

    it("should render Cart Summary description", () => {
      const { getByText } = render(<MerchPage />);
      expect(
        getByText("Order summary with line items and totals."),
      ).toBeTruthy();
    });

    it("should render cart item details", () => {
      const { getAllByText, getByText } = render(<MerchPage />);
      const classicTees = getAllByText("spike.land Classic Tee");
      expect(classicTees.length).toBeGreaterThan(0);
      expect(getByText("Black / M")).toBeTruthy();
    });

    it("should render subtotal", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Subtotal")).toBeTruthy();
    });

    it("should render shipping cost", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Shipping")).toBeTruthy();
      expect(getByText("$4.99")).toBeTruthy();
    });

    it("should render total amount", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Total")).toBeTruthy();
      expect(getByText("$34.98")).toBeTruthy();
    });

    it("should render Checkout button", () => {
      const { getByText } = render(<MerchPage />);
      expect(getByText("Checkout")).toBeTruthy();
    });
  });
});
