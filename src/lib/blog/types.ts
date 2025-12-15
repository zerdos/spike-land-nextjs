/**
 * Blog post frontmatter metadata
 */
export interface BlogPostFrontmatter {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  featured?: boolean;
}

/**
 * Blog post with content
 */
export interface BlogPost {
  frontmatter: BlogPostFrontmatter;
  content: string;
  slug: string;
  readingTime: string;
}

/**
 * Blog post metadata for listing (without content)
 */
export interface BlogPostMeta {
  frontmatter: BlogPostFrontmatter;
  slug: string;
  readingTime: string;
}
