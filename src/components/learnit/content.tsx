import { MDXRemote } from "next-mdx-remote/rsc";
import React from "react";
import { WikiLink } from "./wiki-link";

const components = {
  // Custom component mapping
  WikiLink: WikiLink,
  // Map standard HTML tags to tailored components if needed
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className="text-2xl font-bold mt-8 mb-4 scroll-m-20 border-b pb-2 tracking-tight first:mt-0"
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className="text-xl font-semibold mt-6 mb-3 scroll-m-20 tracking-tight" />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="leading-7 [&:not(:first-child)]:mt-6" />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="my-6 ml-6 list-disc [&>li]:mt-2" />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      {...props}
      className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-black py-4 dark:bg-zinc-900"
    />
  ),
  // Add a generic link handler to intercept [[Wiki Links]] if they were not parsed?
  // Our parser handles this before MDX, but if we wanted to be robust:
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // Check if it's an internal link
    if (props.href && props.href.startsWith("/learnit/")) {
      return <WikiLink topic={props.children as string} className="no-underline" />;
    }
    return <a {...props} className="font-medium text-primary underline underline-offset-4" />;
  },
};

interface LearnItContentProps {
  content: string; // MDX content
}

export function LearnItContent({ content }: LearnItContentProps) {
  return (
    <div className="mdx-content">
      <MDXRemote source={content} components={components} />
    </div>
  );
}
