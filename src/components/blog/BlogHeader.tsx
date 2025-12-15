import { Calendar, Clock, Tag, User } from "lucide-react";
import Image from "next/image";

import type { BlogPostFrontmatter } from "@/lib/blog/types";

interface BlogHeaderProps {
  frontmatter: BlogPostFrontmatter;
  readingTime: string;
}

/**
 * Blog post header with title, meta info, and featured image
 */
export function BlogHeader({ frontmatter, readingTime }: BlogHeaderProps) {
  return (
    <header className="space-y-6">
      {/* Category */}
      <div className="flex items-center gap-2 text-primary">
        <Tag className="h-4 w-4" />
        <span className="text-sm font-medium">{frontmatter.category}</span>
      </div>

      {/* Title */}
      <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
        {frontmatter.title}
      </h1>

      {/* Description */}
      <p className="text-xl text-muted-foreground leading-relaxed">
        {frontmatter.description}
      </p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-border py-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{frontmatter.author}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <time dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{readingTime}</span>
        </div>
      </div>

      {/* Tags */}
      {frontmatter.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Featured Image */}
      {frontmatter.image && (
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <Image
            src={frontmatter.image}
            alt={frontmatter.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
    </header>
  );
}
