import { NextResponse } from "next/server";

import {
  getAllPosts,
  getFeaturedPosts,
  getPostsByCategory,
  getPostsByTag,
} from "@/lib/blog/get-posts";

/**
 * GET /api/blog/posts
 * Returns a list of blog posts with optional filtering
 *
 * Query parameters:
 * - category: Filter by category
 * - tag: Filter by tag
 * - featured: Filter featured posts (true/false)
 * - page: Page number (default: 1)
 * - limit: Posts per page (default: 10)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const tag = url.searchParams.get("tag");
  const featured = url.searchParams.get("featured");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  let posts;

  if (category) {
    posts = getPostsByCategory(category);
  } else if (tag) {
    posts = getPostsByTag(tag);
  } else if (featured === "true") {
    posts = getFeaturedPosts();
  } else {
    posts = getAllPosts();
  }

  // Transform to mobile app expected format
  const transformedPosts = posts.map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    excerpt: post.frontmatter.description,
    content: "", // List endpoint doesn't include full content
    date: post.frontmatter.date,
    author: post.frontmatter.author,
    image: post.frontmatter.image,
    category: post.frontmatter.category,
    tags: post.frontmatter.tags,
    readingTime: post.readingTime,
    featured: post.frontmatter.featured,
  }));

  // Pagination
  const total = transformedPosts.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = transformedPosts.slice(startIndex, endIndex);

  return NextResponse.json({
    posts: paginatedPosts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
