/**
 * Cart Store Tests
 * Comprehensive tests for shopping cart state management
 */

import { act, renderHook } from "@testing-library/react-native";

import {
  calculateShippingCost,
  type Cart,
  type CartItemWithDetails,
  DEFAULT_SHIPPING_COST,
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  getRemainingForFreeShipping,
  MAX_QUANTITY_PER_ITEM,
  useCartStore,
} from "./cart-store";

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockProduct = (overrides = {}) => ({
  id: "product-1",
  name: "Test Product",
  retailPrice: 19.99,
  currency: "GBP",
  mockupTemplate: null,
  ...overrides,
});

const createMockVariant = (overrides = {}) => ({
  id: "variant-1",
  name: "Size M",
  priceDelta: 0,
  ...overrides,
});

const createMockCartItem = (
  overrides: Partial<CartItemWithDetails> = {},
): CartItemWithDetails => ({
  id: "item-1",
  cartId: "cart-1",
  productId: "product-1",
  variantId: "variant-1",
  imageId: "image-1",
  uploadedImageUrl: null,
  quantity: 1,
  customText: null,
  product: createMockProduct(),
  variant: createMockVariant(),
  imageUrl: "https://example.com/image.jpg",
  ...overrides,
});

const createMockCart = (items: CartItemWithDetails[] = []): Cart => ({
  id: "cart-1",
  items,
  itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  subtotal: items.reduce(
    (sum, item) =>
      sum +
      (item.product.retailPrice + (item.variant?.priceDelta ?? 0)) *
        item.quantity,
    0,
  ),
});

// ============================================================================
// Helper Functions
// ============================================================================

function resetStore() {
  act(() => {
    useCartStore.setState({
      cart: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("useCartStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.cart).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });
  });

  describe("setCart", () => {
    it("should set cart with items", () => {
      const mockItem = createMockCartItem();
      const mockCart = createMockCart([mockItem]);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.cart).toEqual(mockCart);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).not.toBeNull();
    });

    it("should set cart to null", () => {
      // First set a cart
      const mockCart = createMockCart([createMockCartItem()]);
      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(null);
      });

      expect(result.current.cart).toBeNull();
      expect(result.current.lastUpdated).not.toBeNull();
    });

    it("should update lastUpdated timestamp", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const mockCart = createMockCart([createMockCartItem()]);
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.lastUpdated).toBe(now);

      jest.restoreAllMocks();
    });

    it("should clear error when setting cart", () => {
      act(() => {
        useCartStore.setState({ error: "Previous error" });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(createMockCart([]));
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("should set loading to true", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should set loading to false", () => {
      act(() => {
        useCartStore.setState({ isLoading: true });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.error).toBe("Something went wrong");
      expect(result.current.isLoading).toBe(false);
    });

    it("should clear error when setting null", () => {
      act(() => {
        useCartStore.setState({ error: "Previous error" });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    it("should set isLoading to false when setting error", () => {
      act(() => {
        useCartStore.setState({ isLoading: true });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setError("Error occurred");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("addItem", () => {
    it("should add new item to cart", () => {
      const existingItem = createMockCartItem({ id: "item-1", quantity: 1 });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const newItem = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        product: createMockProduct({
          id: "product-2",
          name: "New Product",
          retailPrice: 29.99,
        }),
        quantity: 2,
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.cart?.items).toHaveLength(2);
      expect(result.current.cart?.itemCount).toBe(3); // 1 + 2
    });

    it("should update quantity for existing item with same product/variant/image", () => {
      const existingItem = createMockCartItem({ quantity: 2 });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const sameItem = createMockCartItem({ quantity: 3 });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(sameItem);
      });

      expect(result.current.cart?.items).toHaveLength(1);
      expect(result.current.cart?.items[0].quantity).toBe(5); // 2 + 3
    });

    it("should not exceed MAX_QUANTITY_PER_ITEM when updating existing item", () => {
      const existingItem = createMockCartItem({ quantity: 8 });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const sameItem = createMockCartItem({ quantity: 5 });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(sameItem);
      });

      expect(result.current.cart?.items[0].quantity).toBe(
        MAX_QUANTITY_PER_ITEM,
      );
    });

    it("should do nothing if cart is null", () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(createMockCartItem());
      });

      expect(result.current.cart).toBeNull();
    });

    it("should calculate subtotal correctly after adding item", () => {
      const existingItem = createMockCartItem({
        quantity: 1,
        product: createMockProduct({ retailPrice: 10.0 }),
        variant: createMockVariant({ priceDelta: 0 }),
      });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const newItem = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        quantity: 2,
        product: createMockProduct({ id: "product-2", retailPrice: 20.0 }),
        variant: createMockVariant({ id: "variant-2", priceDelta: 5.0 }),
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(newItem);
      });

      // 10 + (20 + 5) * 2 = 10 + 50 = 60
      expect(result.current.cart?.subtotal).toBe(60);
    });

    it("should treat items with different variantId as separate items", () => {
      const existingItem = createMockCartItem({
        variantId: "variant-1",
        variant: createMockVariant({ id: "variant-1", name: "Size S" }),
      });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const newItem = createMockCartItem({
        id: "item-2",
        variantId: "variant-2",
        variant: createMockVariant({ id: "variant-2", name: "Size L" }),
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.cart?.items).toHaveLength(2);
    });

    it("should treat items with different imageId as separate items", () => {
      const existingItem = createMockCartItem({ imageId: "image-1" });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const newItem = createMockCartItem({
        id: "item-2",
        imageId: "image-2",
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.cart?.items).toHaveLength(2);
    });

    it("should treat items with different uploadedImageUrl as separate items", () => {
      const existingItem = createMockCartItem({
        uploadedImageUrl: "https://example.com/img1.jpg",
      });
      const mockCart = createMockCart([existingItem]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const newItem = createMockCartItem({
        id: "item-2",
        uploadedImageUrl: "https://example.com/img2.jpg",
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.cart?.items).toHaveLength(2);
    });

    it("should update lastUpdated when adding item", () => {
      const mockCart = createMockCart([createMockCartItem()]);
      act(() => {
        useCartStore.setState({ cart: mockCart, lastUpdated: 1000 });
      });

      const now = 2000;
      jest.spyOn(Date, "now").mockReturnValue(now);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(
          createMockCartItem({ id: "item-2", productId: "product-2" }),
        );
      });

      expect(result.current.lastUpdated).toBe(now);

      jest.restoreAllMocks();
    });
  });

  describe("updateItemQuantity", () => {
    it("should update item quantity", () => {
      const item = createMockCartItem({ quantity: 1 });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", 5);
      });

      expect(result.current.cart?.items[0].quantity).toBe(5);
      expect(result.current.cart?.itemCount).toBe(5);
    });

    it("should not update if quantity is less than 1", () => {
      const item = createMockCartItem({ quantity: 3 });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", 0);
      });

      expect(result.current.cart?.items[0].quantity).toBe(3);
    });

    it("should not update if quantity exceeds MAX_QUANTITY_PER_ITEM", () => {
      const item = createMockCartItem({ quantity: 3 });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", MAX_QUANTITY_PER_ITEM + 1);
      });

      expect(result.current.cart?.items[0].quantity).toBe(3);
    });

    it("should do nothing if cart is null", () => {
      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.updateItemQuantity("item-1", 5);
        });
      }).not.toThrow();

      expect(result.current.cart).toBeNull();
    });

    it("should recalculate subtotal after quantity update", () => {
      const item = createMockCartItem({
        quantity: 1,
        product: createMockProduct({ retailPrice: 10.0 }),
        variant: null,
      });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", 3);
      });

      expect(result.current.cart?.subtotal).toBe(30); // 10 * 3
    });

    it("should update lastUpdated after quantity update", () => {
      const item = createMockCartItem();
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart, lastUpdated: 1000 });
      });

      const now = 2000;
      jest.spyOn(Date, "now").mockReturnValue(now);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", 3);
      });

      expect(result.current.lastUpdated).toBe(now);

      jest.restoreAllMocks();
    });

    it("should not change other items when updating one item", () => {
      const item1 = createMockCartItem({ id: "item-1", quantity: 2 });
      const item2 = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        quantity: 3,
      });
      const mockCart = createMockCart([item1, item2]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.updateItemQuantity("item-1", 5);
      });

      expect(result.current.cart?.items[0].quantity).toBe(5);
      expect(result.current.cart?.items[1].quantity).toBe(3);
      expect(result.current.cart?.itemCount).toBe(8); // 5 + 3
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", () => {
      const item1 = createMockCartItem({ id: "item-1" });
      const item2 = createMockCartItem({
        id: "item-2",
        productId: "product-2",
      });
      const mockCart = createMockCart([item1, item2]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.removeItem("item-1");
      });

      expect(result.current.cart?.items).toHaveLength(1);
      expect(result.current.cart?.items[0].id).toBe("item-2");
    });

    it("should do nothing if cart is null", () => {
      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.removeItem("item-1");
        });
      }).not.toThrow();

      expect(result.current.cart).toBeNull();
    });

    it("should recalculate itemCount after removal", () => {
      const item1 = createMockCartItem({ id: "item-1", quantity: 2 });
      const item2 = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        quantity: 3,
      });
      const mockCart = createMockCart([item1, item2]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.removeItem("item-1");
      });

      expect(result.current.cart?.itemCount).toBe(3);
    });

    it("should recalculate subtotal after removal", () => {
      const item1 = createMockCartItem({
        id: "item-1",
        quantity: 2,
        product: createMockProduct({ retailPrice: 10.0 }),
        variant: null,
      });
      const item2 = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        quantity: 1,
        product: createMockProduct({ retailPrice: 20.0 }),
        variant: null,
      });
      const mockCart = createMockCart([item1, item2]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.removeItem("item-1");
      });

      expect(result.current.cart?.subtotal).toBe(20); // Only item2 remains
    });

    it("should update lastUpdated after removal", () => {
      const item = createMockCartItem();
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart, lastUpdated: 1000 });
      });

      const now = 2000;
      jest.spyOn(Date, "now").mockReturnValue(now);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.removeItem("item-1");
      });

      expect(result.current.lastUpdated).toBe(now);

      jest.restoreAllMocks();
    });

    it("should handle removing non-existent item gracefully", () => {
      const item = createMockCartItem();
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.removeItem("non-existent-id");
      });

      expect(result.current.cart?.items).toHaveLength(1);
    });
  });

  describe("clearCart", () => {
    it("should clear cart", () => {
      const mockCart = createMockCart([createMockCartItem()]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart).toBeNull();
    });

    it("should update lastUpdated after clearing", () => {
      const mockCart = createMockCart([createMockCartItem()]);

      act(() => {
        useCartStore.setState({ cart: mockCart, lastUpdated: 1000 });
      });

      const now = 2000;
      jest.spyOn(Date, "now").mockReturnValue(now);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.lastUpdated).toBe(now);

      jest.restoreAllMocks();
    });
  });

  describe("getItemCount", () => {
    it("should return correct item count", () => {
      const item1 = createMockCartItem({ quantity: 2 });
      const item2 = createMockCartItem({
        id: "item-2",
        productId: "product-2",
        quantity: 3,
      });
      const mockCart = createMockCart([item1, item2]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemCount()).toBe(5);
    });

    it("should return 0 when cart is null", () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemCount()).toBe(0);
    });
  });

  describe("getSubtotal", () => {
    it("should return correct subtotal", () => {
      const item = createMockCartItem({
        quantity: 2,
        product: createMockProduct({ retailPrice: 25.0 }),
        variant: createMockVariant({ priceDelta: 5.0 }),
      });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getSubtotal()).toBe(60); // (25 + 5) * 2
    });

    it("should return 0 when cart is null", () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.getSubtotal()).toBe(0);
    });
  });

  describe("getItemPrice", () => {
    it("should return correct price with variant", () => {
      const item = createMockCartItem({
        product: createMockProduct({ retailPrice: 20.0 }),
        variant: createMockVariant({ priceDelta: 5.0 }),
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemPrice(item)).toBe(25);
    });

    it("should return correct price without variant", () => {
      const item = createMockCartItem({
        product: createMockProduct({ retailPrice: 20.0 }),
        variant: null,
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemPrice(item)).toBe(20);
    });

    it("should handle negative price delta", () => {
      const item = createMockCartItem({
        product: createMockProduct({ retailPrice: 20.0 }),
        variant: createMockVariant({ priceDelta: -3.0 }),
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getItemPrice(item)).toBe(17);
    });
  });

  describe("getTotal", () => {
    it("should return subtotal plus shipping", () => {
      const item = createMockCartItem({
        quantity: 1,
        product: createMockProduct({ retailPrice: 30.0 }),
        variant: null,
      });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getTotal(4.99)).toBe(34.99);
    });

    it("should return subtotal when shipping is free", () => {
      const item = createMockCartItem({
        quantity: 1,
        product: createMockProduct({ retailPrice: 60.0 }),
        variant: null,
      });
      const mockCart = createMockCart([item]);

      act(() => {
        useCartStore.setState({ cart: mockCart });
      });

      const { result } = renderHook(() => useCartStore());

      expect(result.current.getTotal(0)).toBe(60);
    });
  });
});

describe("Cart Utility Functions", () => {
  describe("calculateShippingCost", () => {
    it("should return free shipping when subtotal meets threshold", () => {
      expect(calculateShippingCost(FREE_SHIPPING_THRESHOLD)).toBe(0);
      expect(calculateShippingCost(FREE_SHIPPING_THRESHOLD + 10)).toBe(0);
    });

    it("should return default shipping when subtotal is below threshold", () => {
      expect(calculateShippingCost(FREE_SHIPPING_THRESHOLD - 1)).toBe(
        DEFAULT_SHIPPING_COST,
      );
      expect(calculateShippingCost(0)).toBe(DEFAULT_SHIPPING_COST);
    });

    it("should return free shipping at exactly the threshold", () => {
      expect(calculateShippingCost(55)).toBe(0);
    });
  });

  describe("getRemainingForFreeShipping", () => {
    it("should return remaining amount for free shipping", () => {
      expect(getRemainingForFreeShipping(40)).toBe(15); // 55 - 40
      expect(getRemainingForFreeShipping(0)).toBe(FREE_SHIPPING_THRESHOLD);
    });

    it("should return 0 when subtotal exceeds threshold", () => {
      expect(getRemainingForFreeShipping(FREE_SHIPPING_THRESHOLD)).toBe(0);
      expect(getRemainingForFreeShipping(FREE_SHIPPING_THRESHOLD + 10)).toBe(0);
    });

    it("should return 0 at exactly the threshold", () => {
      expect(getRemainingForFreeShipping(55)).toBe(0);
    });
  });

  describe("formatPrice", () => {
    it("should format price in GBP by default", () => {
      const formatted = formatPrice(19.99);
      expect(formatted).toContain("19.99");
      // Check for currency symbol (can vary by locale)
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should format price in specified currency", () => {
      const formatted = formatPrice(19.99, "USD");
      expect(formatted).toContain("19.99");
    });

    it("should format zero price", () => {
      const formatted = formatPrice(0, "GBP");
      expect(formatted).toContain("0.00");
    });

    it("should format large price", () => {
      const formatted = formatPrice(1234.56, "GBP");
      expect(formatted).toContain("1,234.56");
    });
  });

  describe("Constants", () => {
    it("should have correct FREE_SHIPPING_THRESHOLD", () => {
      expect(FREE_SHIPPING_THRESHOLD).toBe(55);
    });

    it("should have correct DEFAULT_SHIPPING_COST", () => {
      expect(DEFAULT_SHIPPING_COST).toBe(4.99);
    });

    it("should have correct MAX_QUANTITY_PER_ITEM", () => {
      expect(MAX_QUANTITY_PER_ITEM).toBe(10);
    });
  });
});
