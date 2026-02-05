import { parseWikiLinks } from "@/lib/learnit/wiki-links";
import { MDXRemote } from "next-mdx-remote/rsc";
import React from "react";
import remarkGfm from "remark-gfm";
import { WikiLink } from "./wiki-link";

const components = {
  // Custom component mapping for wiki links
  WikiLink: WikiLink,
  // Handle internal learnit links
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (props.href && props.href.startsWith("/learnit/")) {
      return <WikiLink topic={props.children as string} className="no-underline" />;
    }
    // Props includes children from MDX, let prose-blog handle regular link styling
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...props} />;
  },
};

interface LearnItContentProps {
  content: string; // MDX content
}

export async function LearnItContent({ content }: LearnItContentProps) {
  const { default: rehypePrettyCode } = await import("rehype-pretty-code");
  // Parse wiki-links [[topic]] to markdown links before rendering
  const { content: parsedContent } = parseWikiLinks(content);

  return (
    <div className="prose-blog max-w-none">
      <MDXRemote
        source={parsedContent}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              [rehypePrettyCode, {
                theme: "github-dark",
                keepBackground: true,
                onVisitLine(node: { children: unknown[]; }) {
                  if (node.children?.length === 0) {
                    node.children = [{ type: "text", value: " " }];
                  }
                },
              }],
            ],
          },
        }}
      />
    </div>
  );
}
