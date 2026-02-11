import fs from "fs";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";
import { cache } from "react";

import { tryCatchSync } from "@/lib/try-catch";

import type { BlogPost, BlogPostMeta } from "./types";
import { blogPostFrontmatterSchema } from "./types";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/**
 * Get all blog post slugs for static generation
 */
export const getPostSlugs = cache(function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const { data: files, error } = tryCatchSync(() => fs.readdirSync(BLOG_DIR));

  if (error) {
    console.error("Failed to read blog directory:", error.message);
    return [];
  }

  const slugSafePattern = /^[a-zA-Z0-9_-]+$/;
  return files
    .filter((file) => file.toString().endsWith(".mdx"))
    .map((file) => file.toString().replace(/\.mdx$/, ""))
    .filter((slug) => slugSafePattern.test(slug));
});

/**
 * Internal helper to read and parse a blog post file.
 * NOT CACHED to avoid pinning large content strings in memory when iterating all posts.
 */
function readPostData(slug: string): BlogPost | null {
  // Validate slug to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    console.error(`Invalid slug: ${slug}`);
    return null;
  }

  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const { data: fileContents, error: readError } = tryCatchSync(() =>
    fs.readFileSync(filePath, "utf8")
  );

  if (readError) {
    console.error(`Failed to read ${slug}.mdx:`, readError.message);
    return null;
  }

  const { data: parsed, error: parseError } = tryCatchSync(() => matter(fileContents));

  if (parseError) {
    console.error(
      `Failed to parse frontmatter in ${slug}.mdx:`,
      parseError.message,
    );
    return null;
  }

  const { data, content } = parsed;

  const { data: stats, error: readingTimeError } = tryCatchSync(() => readingTime(content));

  if (readingTimeError) {
    console.error(
      `Failed to calculate reading time for ${slug}.mdx:`,
      readingTimeError.message,
    );
    return null;
  }

  // Validate frontmatter with Zod schema
  const parseResult = blogPostFrontmatterSchema.safeParse(data);

  if (!parseResult.success) {
    console.error(
      `Invalid frontmatter in ${slug}.mdx:`,
      parseResult.error.flatten().fieldErrors,
    );
    return null;
  }

  return {
    frontmatter: parseResult.data,
    content,
    slug,
    readingTime: stats.text,
  };
}

/**
 * Get a single blog post by slug.
 * Validates frontmatter using Zod schema.
 */
export const getPostBySlug = cache(function getPostBySlug(slug: string): BlogPost | null {
  return readPostData(slug);
});

/**
 * Get all blog posts with metadata (for listing pages)
 * Returns posts sorted by date (newest first)
 * Filters out unlisted posts (frontmatter.listed === false)
 */
export const getAllPosts = cache(function getAllPosts(): BlogPostMeta[] {
  const slugs = getPostSlugs();

  const posts = slugs
    .map((slug) => {
      const post = readPostData(slug);
      if (!post) return null;

      return {
        frontmatter: post.frontmatter,
        slug: post.slug,
        readingTime: post.readingTime,
      };
    })
    .filter((post): post is BlogPostMeta => post !== null)
    // Filter out unlisted posts (listed defaults to true via Zod schema)
    .filter((post) => post.frontmatter.listed !== false);

  // Sort by date (newest first)
  return posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date);
    const dateB = new Date(b.frontmatter.date);
    return dateB.getTime() - dateA.getTime();
  });
});

/**
 * Get posts by category
 */
export function getPostsByCategory(category: string): BlogPostMeta[] {
  return getAllPosts().filter(
    (post) => post.frontmatter.category.toLowerCase() === category.toLowerCase(),
  );
}

/**
 * Get posts by tag
 */
export function getPostsByTag(tag: string): BlogPostMeta[] {
  return getAllPosts().filter((post) =>
    post.frontmatter.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get featured posts
 */
export function getFeaturedPosts(): BlogPostMeta[] {
  return getAllPosts().filter((post) => post.frontmatter.featured);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const posts = getAllPosts();
  const categories = new Set(posts.map((post) => post.frontmatter.category));
  return Array.from(categories).sort();
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tags = new Set(posts.flatMap((post) => post.frontmatter.tags));
  return Array.from(tags).sort();
}
