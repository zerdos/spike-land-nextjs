import type { Metadata } from "next";
import { serialize } from "next-mdx-remote/serialize";
import { notFound } from "next/navigation";

import { BlogHeader, Prose } from "@/components/blog";
import { MDXContent } from "@/components/blog/MDXContent";
import { Button } from "@/components/ui/button";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog/get-posts";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering for blog posts with interactive MDX components
// next-mdx-remote uses React hooks that require client-side rendering
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Spike Land Blog",
    };
  }

  const { frontmatter } = post;

  return {
    title: `${frontmatter.title} | Spike Land Blog`,
    description: frontmatter.description,
    authors: [{ name: frontmatter.author }],
    keywords: frontmatter.tags,
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      type: "article",
      url: `https://spike.land/blog/${slug}`,
      images: frontmatter.image ? [{ url: frontmatter.image }] : undefined,
      publishedTime: frontmatter.date,
      authors: [frontmatter.author],
      tags: frontmatter.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: frontmatter.image ? [frontmatter.image] : undefined,
    },
  };
}

/**
 * Generate static params for all blog posts.
 * Used for path discovery (sitemap, SEO) even with dynamic rendering.
 * Static generation is disabled due to next-mdx-remote hook requirements.
 */
export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content, readingTime } = post;

  // Serialize MDX content for client-side rendering with interactive components
  const mdxSource = await serialize(content);

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen py-12">
      <article className="container mx-auto px-4 max-w-3xl">
        {/* Back to blog */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <BlogHeader frontmatter={frontmatter} readingTime={readingTime} />

        {/* Content */}
        <Prose className="mt-12">
          <MDXContent source={mdxSource} />
        </Prose>

        {/* Navigation */}
        <nav className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {prevPost
              ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="group flex-1 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="text-sm text-muted-foreground mb-1">
                    Previous
                  </div>
                  <div className="font-medium group-hover:text-primary transition-colors">
                    {prevPost.frontmatter.title}
                  </div>
                </Link>
              )
              : <div className="flex-1" />}
            {nextPost && (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="group flex-1 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-right"
              >
                <div className="text-sm text-muted-foreground mb-1">Next</div>
                <div className="font-medium group-hover:text-primary transition-colors">
                  {nextPost.frontmatter.title}
                </div>
              </Link>
            )}
          </div>
        </nav>

        {/* CTA */}
        <div className="mt-12 p-8 bg-card rounded-xl text-center">
          <h3 className="font-heading text-2xl font-bold mb-3">
            Ready to try Pixel?
          </h3>
          <p className="text-muted-foreground mb-6">
            Transform your photos with AI-powered enhancement. Get started free with 50 tokens.
          </p>
          <Button asChild size="lg" className="shadow-glow-cyan">
            <Link href="/apps/pixel">Try Pixel Free</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}
