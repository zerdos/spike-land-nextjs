/**
 * Merch API Service
 * Handles merchandise store API calls
 */

import type {
  AddToCartRequest,
  MerchCategory,
  MerchProduct,
  MerchVariant,
} from "@spike-npm-land/shared";
import type { Cart } from "../../stores/cart-store";
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
export async function getCategories(): Promise<
  ApiResponse<CategoriesResponse>
> {
  return apiClient.get<CategoriesResponse>("/api/merch/categories");
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
