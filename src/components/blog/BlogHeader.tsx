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
    <header>
      {/* Category */}
      <div className="flex items-center gap-2 text-primary mb-4">
        <Tag className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{frontmatter.category}</span>
      </div>

      {/* Title */}
      <h1 className="font-heading text-4xl md:text-5xl font-bold leading-snug tracking-tight mb-3">
        {frontmatter.title}
      </h1>

      {/* Description */}
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        {frontmatter.description}
      </p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-foreground/70 border-y border-border py-4">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 shrink-0" />
          <span>{frontmatter.author}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 shrink-0" />
          <time dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{readingTime}</span>
        </div>
      </div>

      {/* Tags */}
      {frontmatter.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium bg-primary/10 text-primary/80 px-2.5 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Featured Image */}
      {frontmatter.image && (
        <div className="relative aspect-video overflow-hidden rounded-xl mt-8">
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
