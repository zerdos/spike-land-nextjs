import type { Metadata } from "next";

import { BlogCard } from "@/components/blog";
import { getAllPosts } from "@/lib/blog/get-posts";

export const metadata: Metadata = {
  title: "Blog | Spike Land",
  description:
    "Latest news, tutorials, and updates from Spike Land. Learn about AI image enhancement, product updates, and more.",
  openGraph: {
    title: "Blog | Spike Land",
    description:
      "Latest news, tutorials, and updates from Spike Land. Learn about AI image enhancement, product updates, and more.",
    type: "website",
    url: "https://spike.land/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Spike Land",
    description:
      "Latest news, tutorials, and updates from Spike Land. Learn about AI image enhancement, product updates, and more.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Latest news, tutorials, and updates from Spike Land
          </p>
        </header>

        {/* Posts Grid */}
        {posts.length > 0
          ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => <BlogCard key={post.slug} post={post} />)}
            </div>
          )
          : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No blog posts yet. Check back soon!
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
