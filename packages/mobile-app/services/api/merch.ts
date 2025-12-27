/**
 * Merch API Service
 * Handles merchandise store API calls
 */

import type {
  AddToCartRequest,
  CreateOrderRequest,
  MerchCategory,
  MerchOrder,
  MerchOrderItem,
  MerchOrderStatus,
  MerchProduct,
  MerchVariant,
  ShippingAddress,
} from "@spike-land/shared";
import type { Cart, CartItemWithDetails } from "../../stores/cart-store";
import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface ProductWithDetails extends MerchProduct {
  category: Pick<MerchCategory, "id" | "name" | "slug">;
  variants: Pick<MerchVariant, "id" | "name" | "priceDelta" | "attributes">[];
}

export interface ProductListResponse {
  products: ProductWithDetails[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoriesResponse {
  categories: MerchCategory[];
}

export interface CartResponse {
  cart: Cart | null;
}

export interface AddToCartResponse {
  success: boolean;
  cart: Cart;
}

export interface UpdateCartItemResponse {
  success: boolean;
  cart: Cart;
}

export interface CheckoutInitResponse {
  orderId: string;
  orderNumber: string;
  clientSecret: string;
  summary: {
    subtotal: number;
    shipping: number;
    shippingZone: string;
    freeShippingThreshold: number;
    total: number;
    currency: string;
    itemCount: number;
  };
}

export interface OrderWithItems extends MerchOrder {
  items: MerchOrderItemWithDetails[];
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface MerchOrderItemWithDetails extends MerchOrderItem {
  product: Pick<MerchProduct, "id" | "name" | "mockupTemplate">;
  variant: Pick<MerchVariant, "id" | "name"> | null;
}

export interface OrdersResponse {
  orders: OrderWithItems[];
  total: number;
  page: number;
  limit: number;
}

export interface ShippingRatesResponse {
  rates: Array<{
    id: string;
    name: string;
    cost: number;
    estimatedDays: number;
  }>;
  freeShippingThreshold: number;
}

// ============================================================================
// Products API
// ============================================================================

/**
 * Get all products with optional filters
 */
export async function getProducts(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<ProductListResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return apiClient.get<ProductListResponse>(
    `/api/merch/products${query ? `?${query}` : ""}`,
  );
}

/**
 * Get a single product by ID
 */
export async function getProduct(
  productId: string,
): Promise<ApiResponse<ProductWithDetails>> {
  return apiClient.get<ProductWithDetails>(`/api/merch/products/${productId}`);
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<ApiResponse<CategoriesResponse>> {
  return apiClient.get<CategoriesResponse>("/api/merch/categories");
}

/**
 * Get featured products
 */
export async function getFeaturedProducts(): Promise<
  ApiResponse<ProductListResponse>
> {
  return apiClient.get<ProductListResponse>("/api/merch/products/featured");
}

// ============================================================================
// Cart API
// ============================================================================

/**
 * Get current user's cart
 */
export async function getCart(): Promise<ApiResponse<CartResponse>> {
  return apiClient.get<CartResponse>("/api/merch/cart");
}

/**
 * Add item to cart
 */
export async function addToCart(
  request: AddToCartRequest,
): Promise<ApiResponse<AddToCartResponse>> {
  return apiClient.post<AddToCartResponse>("/api/merch/cart", request);
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<ApiResponse<UpdateCartItemResponse>> {
  return apiClient.patch<UpdateCartItemResponse>(`/api/merch/cart/${itemId}`, {
    quantity,
  });
}

/**
 * Remove item from cart
 */
export async function removeCartItem(
  itemId: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.delete<{ success: boolean; }>(`/api/merch/cart/${itemId}`);
}

/**
 * Clear cart
 */
export async function clearCart(): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.delete<{ success: boolean; }>("/api/merch/cart");
}

// ============================================================================
// Checkout API
// ============================================================================

/**
 * Get shipping rates for the current cart
 */
export async function getShippingRates(
  countryCode: string,
): Promise<ApiResponse<ShippingRatesResponse>> {
  return apiClient.get<ShippingRatesResponse>(
    `/api/merch/shipping/rates?country=${countryCode}`,
  );
}

/**
 * Initialize checkout and create order
 */
export async function initializeCheckout(
  request: CreateOrderRequest,
): Promise<ApiResponse<CheckoutInitResponse>> {
  return apiClient.post<CheckoutInitResponse>("/api/merch/checkout", {
    shippingAddress: request.shippingAddress,
    customerEmail: request.email,
    customerPhone: request.phone,
    notes: request.notes,
  });
}

/**
 * Complete checkout with RevenueCat payment
 * Used for in-app purchases in the mobile app
 */
export async function completeCheckoutWithIAP(
  orderId: string,
  purchaseToken: string,
  productId: string,
): Promise<ApiResponse<{ success: boolean; order: OrderWithItems; }>> {
  return apiClient.post<{ success: boolean; order: OrderWithItems; }>(
    `/api/merch/checkout/${orderId}/complete-iap`,
    {
      purchaseToken,
      productId,
    },
  );
}

// ============================================================================
// Orders API
// ============================================================================

/**
 * Get user's orders
 */
export async function getOrders(params?: {
  status?: MerchOrderStatus;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<OrdersResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return apiClient.get<OrdersResponse>(
    `/api/merch/orders${query ? `?${query}` : ""}`,
  );
}

/**
 * Get a single order by ID
 */
export async function getOrder(
  orderId: string,
): Promise<ApiResponse<OrderWithItems>> {
  return apiClient.get<OrderWithItems>(`/api/merch/orders/${orderId}`);
}

/**
 * Cancel an order (only if still pending)
 */
export async function cancelOrder(
  orderId: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.post<{ success: boolean; }>(
    `/api/merch/orders/${orderId}/cancel`,
  );
}

// ============================================================================
// User Images API (for product customization)
// ============================================================================

/**
 * Get user's enhanced images for product customization
 */
export async function getUserEnhancedImages(params?: {
  page?: number;
  limit?: number;
}): Promise<
  ApiResponse<{
    images: Array<{
      id: string;
      originalUrl: string;
      enhancedUrl: string | null;
      width: number;
      height: number;
    }>;
    total: number;
  }>
> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return apiClient.get<{
    images: Array<{
      id: string;
      originalUrl: string;
      enhancedUrl: string | null;
      width: number;
      height: number;
    }>;
    total: number;
  }>(`/api/images${query ? `?${query}` : ""}`);
}

/**
 * Upload image for merch product
 */
export async function uploadMerchImage(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<
  ApiResponse<{
    imageUrl: string;
    r2Key: string;
    width: number;
    height: number;
  }>
> {
  return apiClient.uploadFile<{
    imageUrl: string;
    r2Key: string;
    width: number;
    height: number;
  }>("/api/merch/upload", file);
}
