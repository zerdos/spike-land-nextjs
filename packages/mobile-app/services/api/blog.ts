/**
 * Blog API Service
 * Handles fetching blog posts from the API
 */

import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

/**
 * Blog post author information
 */
export interface BlogAuthor {
  name: string;
  avatar?: string;
}

/**
 * Blog post data structure
 */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  image?: string;
  category: string;
  tags: string[];
  readingTime: string;
  featured?: boolean;
}

/**
 * Blog posts list response
 */
export interface BlogPostsResponse {
  posts: BlogPost[];
  total: number;
}

/**
 * Single blog post response
 */
export interface BlogPostResponse {
  post: BlogPost;
}

/**
 * Parameters for fetching blog posts
 */
export interface GetBlogPostsParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Fetch all blog posts with optional filtering
 */
export async function getBlogPosts(
  params?: GetBlogPostsParams,
): Promise<ApiResponse<BlogPostsResponse>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.tag) searchParams.set("tag", params.tag);
  if (params?.featured !== undefined) {
    searchParams.set("featured", String(params.featured));
  }

  const query = searchParams.toString();
  return apiClient.get<BlogPostsResponse>(
    `/api/blog/posts${query ? `?${query}` : ""}`,
  );
}

/**
 * Fetch a single blog post by slug
 */
export async function getBlogPost(
  slug: string,
): Promise<ApiResponse<BlogPostResponse>> {
  return apiClient.get<BlogPostResponse>(`/api/blog/posts/${slug}`);
}

/**
 * Get featured blog posts
 */
export async function getFeaturedPosts(): Promise<ApiResponse<BlogPostsResponse>> {
  return getBlogPosts({ featured: true });
}

/**
 * Get blog posts by category
 */
export async function getBlogPostsByCategory(
  category: string,
): Promise<ApiResponse<BlogPostsResponse>> {
  return getBlogPosts({ category });
}

/**
 * Get blog posts by tag
 */
export async function getBlogPostsByTag(
  tag: string,
): Promise<ApiResponse<BlogPostsResponse>> {
  return getBlogPosts({ tag });
}
