"use client";

import type { z } from "zod";
import type { MarkdownContentSchema } from "@/lib/dynamic-pages/block-schemas";
import type { Prisma } from "@/generated/prisma";

type MarkdownContent = z.infer<typeof MarkdownContentSchema>;

interface MarkdownBlockProps {
  content: Prisma.JsonValue;
  variant?: string;
}

/**
 * Renders markdown/HTML content in a prose-styled container.
 * The content is expected to be pre-rendered HTML or simple text,
 * authored by authenticated page creators via MCP tools.
 * Sanitization is enforced at the MCP tool layer before storage.
 */
export function MarkdownBlock({ content }: MarkdownBlockProps) {
  const data = content as MarkdownContent;

  return (
    <section className="w-full py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto">
        {/* SECURITY: Content is authored by authenticated page creators via
            MCP tools, not arbitrary user input. The MCP layer validates and
            sanitizes content before it reaches the database. */}
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: data.content }}
        />
      </div>
    </section>
  );
}
