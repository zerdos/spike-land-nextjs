import { Calendar, Clock, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { BlogPostMeta } from "@/lib/blog/types";

interface BlogCardProps {
  post: BlogPostMeta;
}

/**
 * Blog post preview card for listing pages
 */
export function BlogCard({ post }: BlogCardProps) {
  const { frontmatter, slug, readingTime } = post;

  return (
    <Link href={`/blog/${slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-glow-cyan-sm hover:border-primary/50">
        {/* Cover Image */}
        {frontmatter.image && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={frontmatter.image}
              alt={frontmatter.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {frontmatter.featured && (
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                Featured
              </div>
            )}
          </div>
        )}

        <CardHeader className="pb-2">
          {/* Category */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Tag className="h-3 w-3" />
            <span>{frontmatter.category}</span>
          </div>

          {/* Title */}
          <h3 className="font-heading text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {frontmatter.title}
          </h3>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Description */}
          <p className="text-muted-foreground text-sm line-clamp-3">
            {frontmatter.description}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <time dateTime={frontmatter.date}>
                {new Date(frontmatter.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{readingTime}</span>
            </div>
          </div>

          {/* Tags */}
          {frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {frontmatter.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {frontmatter.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{frontmatter.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
