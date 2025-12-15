"use client";

import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { mdxComponents } from "./MDXComponents";

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

/**
 * Client component wrapper for MDX content rendering
 * This enables the use of interactive components like ImageComparisonSlider
 */
export function MDXContent({ source }: MDXContentProps) {
  return <MDXRemote {...source} components={mdxComponents} />;
}
