/**
 * Image API Service
 * Handles image upload, enhancement, and gallery operations
 */

import type {
  Album,
  EnhancedImage,
  EnhancementTier,
  ImageEnhancementJob,
} from "@spike-npm-land/shared";
import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface UploadImageResponse {
  image: EnhancedImage;
  job?: ImageEnhancementJob;
}

export interface EnhanceImageParams {
  imageId: string;
  tier: EnhancementTier;
  prompt?: string;
  pipelineId?: string;
}

export interface BatchEnhanceParams {
  imageIds: string[];
  tier: EnhancementTier;
}

export interface ImagesListParams {
  page?: number;
  limit?: number;
  albumId?: string;
}

export interface ImagesListResponse {
  images: EnhancedImage[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Upload an image from device
 */
export async function uploadImage(
  file: { uri: string; name: string; type: string; },
  tier?: EnhancementTier,
): Promise<ApiResponse<UploadImageResponse>> {
  return apiClient.uploadFile<UploadImageResponse>("/api/images/upload", file, {
    tier: tier || "TIER_1K",
  });
}

/**
 * Enhance an existing image
 */
export async function enhanceImage(
  params: EnhanceImageParams,
): Promise<ApiResponse<{ job: ImageEnhancementJob; }>> {
  return apiClient.post<{ job: ImageEnhancementJob; }>(
    "/api/images/enhance",
    params,
  );
}

/**
 * Batch enhance multiple images
 */
export async function batchEnhanceImages(
  params: BatchEnhanceParams,
): Promise<ApiResponse<{ jobs: ImageEnhancementJob[]; }>> {
  return apiClient.post<{ jobs: ImageEnhancementJob[]; }>(
    "/api/images/batch-enhance",
    params,
  );
}

/**
 * Get user's images
 */
export async function getImages(
  params?: ImagesListParams,
): Promise<ApiResponse<ImagesListResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.albumId) searchParams.set("albumId", params.albumId);

  const query = searchParams.toString();
  return apiClient.get<ImagesListResponse>(
    `/api/images${query ? `?${query}` : ""}`,
  );
}

/**
 * Get a single image by ID
 */
export async function getImage(
  imageId: string,
): Promise<ApiResponse<{ image: EnhancedImage; }>> {
  return apiClient.get<{ image: EnhancedImage; }>(`/api/images/${imageId}`);
}

/**
 * Delete an image
 */
export async function deleteImage(
  imageId: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.delete<{ success: boolean; }>(`/api/images/${imageId}`);
}

/**
 * Create a share link for an image
 */
export async function shareImage(
  imageId: string,
): Promise<ApiResponse<{ shareToken: string; shareUrl: string; }>> {
  return apiClient.post<{ shareToken: string; shareUrl: string; }>(
    `/api/images/${imageId}/share`,
  );
}

// ============================================================================
// Album Methods
// ============================================================================

/**
 * Get user's albums
 */
export async function getAlbums(): Promise<ApiResponse<{ albums: Album[]; }>> {
  return apiClient.get<{ albums: Album[]; }>("/api/albums");
}

/**
 * Create a new album
 */
export async function createAlbum(params: {
  name: string;
  description?: string;
  privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC";
  defaultTier?: EnhancementTier;
}): Promise<ApiResponse<{ album: Album; }>> {
  return apiClient.post<{ album: Album; }>("/api/albums", params);
}

/**
 * Update an album
 */
export async function updateAlbum(
  albumId: string,
  params: Partial<{
    name: string;
    description: string;
    privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
    defaultTier: EnhancementTier;
  }>,
): Promise<ApiResponse<{ album: Album; }>> {
  return apiClient.patch<{ album: Album; }>(`/api/albums/${albumId}`, params);
}

/**
 * Delete an album
 */
export async function deleteAlbum(
  albumId: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.delete<{ success: boolean; }>(`/api/albums/${albumId}`);
}

/**
 * Add images to an album
 */
export async function addImagesToAlbum(
  albumId: string,
  imageIds: string[],
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.post<{ success: boolean; }>(
    `/api/albums/${albumId}/images`,
    { imageIds },
  );
}
