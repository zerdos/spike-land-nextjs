"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface WikiLinkProps {
  topic: string; // The raw topic text, e.g. "React Hooks"
  alias?: string; // Optional display text
  className?: string;
}

export function WikiLink({ topic, alias, className }: WikiLinkProps) {
  const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const href = `/learnit/${slug}`;
  const displayText = alias || topic;

  return (
    <Link
      href={href}
      className={cn(
        "text-primary hover:underline font-medium decoration-primary/30 underline-offset-4",
        "transition-colors hover:decoration-primary",
        className,
      )}
    >
      {displayText}
    </Link>
  );
}
