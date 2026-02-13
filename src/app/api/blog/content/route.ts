import { getPostBySlug } from "@/lib/blog/get-posts";
import { NextResponse } from "next/server";

/**
 * Strip MDX/Markdown syntax from content to produce plain text.
 */
export function stripMdx(content: string): string {
  return content
    // Remove code blocks (```...```)
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code (`...`)
    .replace(/`([^`]+)`/g, "$1")
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headings (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold **text** or __text__
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    // Remove italic *text* or _text_
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove horizontal rules
    .replace(/^---+$/gm, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Remove MDX component tags (self-closing and opening/closing)
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*\/?>/g, "")
    // Collapse multiple newlines into double
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get("slugs");

  if (!slugsParam) {
    return NextResponse.json(
      { error: "slugs query parameter is required" },
      { status: 400 },
    );
  }

  const slugs = slugsParam.split(",").map(s => s.trim()).filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json(
      { error: "At least one slug is required" },
      { status: 400 },
    );
  }

  if (slugs.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 slugs allowed" },
      { status: 400 },
    );
  }

  const posts = slugs
    .map(slug => {
      const post = getPostBySlug(slug);
      if (!post) return null;

      return {
        slug: post.slug,
        title: post.frontmatter.title,
        description: post.frontmatter.description,
        tags: post.frontmatter.tags,
        plainText: stripMdx(post.content),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ posts });
}
