import type { Metadata } from "next";
import { serialize } from "next-mdx-remote/serialize";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

import { BlogHeader, Prose } from "@/components/blog";
import { LanguageBanner } from "@/components/blog/LanguageBanner";
import { MDXContent } from "@/components/blog/MDXContent";
import { ReadAloudArticle } from "@/components/blog/ReadAloudArticle";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog/get-posts";
import { getAvailableLanguages, getTranslatedPost } from "@/lib/blog/get-translations";
import { resolveLanguage } from "@/lib/blog/language-detection";
import type { SupportedLanguage } from "@/lib/blog/types";
import { ArrowLeft } from "lucide-react";

// Force dynamic rendering for blog posts with interactive MDX components
// next-mdx-remote uses React hooks that require client-side rendering
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { lang: queryLang } = await searchParams;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Spike Land Blog",
    };
  }

  // Resolve language for metadata
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLang = cookieStore.get("spike-lang")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  const lang = resolveLanguage({ queryLang, cookieLang, acceptLanguage });

  // Use translated title/description if available
  const translatedPost = lang !== "en" ? getTranslatedPost(slug, lang) : null;
  const { frontmatter } = translatedPost ?? post;

  const availableLanguages = getAvailableLanguages(slug);

  // Build hreflang alternates
  const alternates: Record<string, string> = {
    "x-default": `https://spike.land/blog/${slug}`,
    en: `https://spike.land/blog/${slug}`,
  };
  for (const l of availableLanguages) {
    alternates[l] = `https://spike.land/blog/${slug}?lang=${l}`;
  }

  return {
    title: `${frontmatter.title} | Spike Land Blog`,
    description: frontmatter.description,
    authors: [{ name: frontmatter.author }],
    keywords: frontmatter.tags,
    alternates: {
      languages: alternates,
    },
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

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { lang: queryLang } = await searchParams;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Resolve display language
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLang = cookieStore.get("spike-lang")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  const lang = resolveLanguage({ queryLang, cookieLang, acceptLanguage });

  // Load translated post if not English
  const translatedPost = lang !== "en" ? getTranslatedPost(slug, lang) : null;
  const displayPost = translatedPost ?? post;
  const displayLang: SupportedLanguage = translatedPost ? lang : "en";

  const { frontmatter, content, readingTime } = displayPost;

  // Get available translations for the banner
  const availableLanguages = getAvailableLanguages(slug);

  // Serialize MDX content for client-side rendering with interactive components
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [rehypePrettyCode, {
          theme: "github-dark",
          keepBackground: true,
        }],
      ],
    },
  });

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const prevPost = currentIndex < allPosts.length - 1
    ? allPosts[currentIndex + 1]
    : null;

  return (
    <div className="min-h-screen bg-grid-pattern">
      <article className="container mx-auto px-6 max-w-4xl lg:max-w-5xl pt-24 pb-12">
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

        {/* Language Banner */}
        {availableLanguages.length > 0 && (
          <div className="mt-6">
            <LanguageBanner
              currentLang={displayLang}
              availableLanguages={availableLanguages}
              slug={slug}
            />
          </div>
        )}

        {/* Listen to article */}
        <div className="mt-6">
          <ReadAloudArticle />
        </div>

        {/* Content */}
        <Prose className="mt-12" data-article-content>
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
            <Link href="/pixel">Try Pixel Free</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}
