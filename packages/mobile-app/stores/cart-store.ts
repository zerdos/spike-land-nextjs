/**
 * Cart Store
 * Manages shopping cart state with Zustand
 */

import type { MerchCartItem, MerchProduct, MerchVariant } from "@spike-npm-land/shared";
import { create } from "zustand";

// ============================================================================
// Types
// ============================================================================

export interface CartItemWithDetails extends MerchCartItem {
  product: Pick<MerchProduct, "id" | "name" | "retailPrice" | "currency" | "mockupTemplate">;
  variant: Pick<MerchVariant, "id" | "name" | "priceDelta"> | null;
  imageUrl: string | null;
}

export interface Cart {
  id: string;
  items: CartItemWithDetails[];
  itemCount: number;
  subtotal: number;
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface CartActions {
  setCart: (cart: Cart | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addItem: (item: CartItemWithDetails) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getItemPrice: (item: CartItemWithDetails) => number;
  getTotal: (shippingCost: number) => number;
}

type CartStore = CartState & CartActions;

// ============================================================================
// Constants
// ============================================================================

export const FREE_SHIPPING_THRESHOLD = 55;
export const DEFAULT_SHIPPING_COST = 4.99;
export const MAX_QUANTITY_PER_ITEM = 10;

// ============================================================================
// Store
// ============================================================================

export const useCartStore = create<CartStore>((set, get) => ({
  // Initial state
  cart: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  setCart: (cart) => {
    set({
      cart,
      lastUpdated: Date.now(),
      error: null,
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  addItem: (item) => {
    const { cart } = get();
    if (!cart) return;

    // Check if item already exists
    const existingIndex = cart.items.findIndex(
      (i) =>
        i.productId === item.productId &&
        i.variantId === item.variantId &&
        i.imageId === item.imageId &&
        i.uploadedImageUrl === item.uploadedImageUrl,
    );

    let updatedItems: CartItemWithDetails[];
    if (existingIndex >= 0) {
      // Update quantity
      updatedItems = cart.items.map((i, idx) =>
        idx === existingIndex
          ? { ...i, quantity: Math.min(i.quantity + item.quantity, MAX_QUANTITY_PER_ITEM) }
          : i
      );
    } else {
      // Add new item
      updatedItems = [...cart.items, item];
    }

    const newCart = {
      ...cart,
      items: updatedItems,
      itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: updatedItems.reduce(
        (sum, i) => sum + get().getItemPrice(i) * i.quantity,
        0,
      ),
    };

    set({ cart: newCart, lastUpdated: Date.now() });
  },

  updateItemQuantity: (itemId, quantity) => {
    const { cart } = get();
    if (!cart) return;

    if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) return;

    const updatedItems = cart.items.map((i) => i.id === itemId ? { ...i, quantity } : i);

    const newCart = {
      ...cart,
      items: updatedItems,
      itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: updatedItems.reduce(
        (sum, i) => sum + get().getItemPrice(i) * i.quantity,
        0,
      ),
    };

    set({ cart: newCart, lastUpdated: Date.now() });
  },

  removeItem: (itemId) => {
    const { cart } = get();
    if (!cart) return;

    const updatedItems = cart.items.filter((i) => i.id !== itemId);

    const newCart = {
      ...cart,
      items: updatedItems,
      itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: updatedItems.reduce(
        (sum, i) => sum + get().getItemPrice(i) * i.quantity,
        0,
      ),
    };

    set({ cart: newCart, lastUpdated: Date.now() });
  },

  clearCart: () => {
    set({
      cart: null,
      lastUpdated: Date.now(),
    });
  },

  getItemCount: () => {
    const { cart } = get();
    return cart?.itemCount ?? 0;
  },

  getSubtotal: () => {
    const { cart } = get();
    return cart?.subtotal ?? 0;
  },

  getItemPrice: (item) => {
    return item.product.retailPrice + (item.variant?.priceDelta ?? 0);
  },

  getTotal: (shippingCost) => {
    return get().getSubtotal() + shippingCost;
  },
}));

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate shipping cost based on subtotal
 */
export function calculateShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
}

/**
 * Get remaining amount for free shipping
 */
export function getRemainingForFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(price);
}
