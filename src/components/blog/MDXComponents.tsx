"use client";

import type { MDXComponents } from "mdx/types";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ImagePlaceholder } from "./ImagePlaceholder";

// Dynamic imports with SSR disabled to prevent React hooks errors during static generation
const ImageComparisonSlider = dynamic(
  () =>
    import("@/components/enhance/ImageComparisonSlider").then(
      (mod) => mod.ImageComparisonSlider,
    ),
  {
    ssr: false,
    loading: () => <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />,
  },
);

const SplitPreview = dynamic(
  () => import("@/components/enhance/SplitPreview").then((mod) => mod.SplitPreview),
  {
    ssr: false,
    loading: () => <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />,
  },
);

/**
 * Callout component for displaying info, warning, or success messages in blog posts.
 * Renders a styled box with a colored left border based on the message type.
 *
 * @param type - The type of callout: "info" (blue), "warning" (yellow), or "success" (green)
 * @param children - The content to display inside the callout
 *
 * @example
 * ```mdx
 * <Callout type="info">
 *   This is an informational callout.
 * </Callout>
 * ```
 */
function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-primary/10 border-primary text-foreground",
    warning: "bg-warning border-warning text-foreground",
    success: "bg-success border-success text-foreground",
  };
  return (
    <div className={cn("border-l-4 p-4 my-6 rounded-r-lg", styles[type])}>
      {children}
    </div>
  );
}

/**
 * Gallery component for displaying multiple images in a responsive grid layout.
 * Images are displayed in a single column on mobile and two columns on larger screens.
 *
 * @param children - Image elements or other content to display in the gallery
 *
 * @example
 * ```mdx
 * <Gallery>
 *   <img src="/image1.jpg" alt="First image" />
 *   <img src="/image2.jpg" alt="Second image" />
 * </Gallery>
 * ```
 */
function Gallery({ children }: { children: React.ReactNode; }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">{children}</div>;
}

/**
 * Call-to-action button component for prominent links in blog posts.
 * Renders a centered, styled button with the Pixel cyan glow effect.
 *
 * @param href - The URL to navigate to when clicked
 * @param children - The button label text
 *
 * @example
 * ```mdx
 * <CTAButton href="/apps/pixel">Try Pixel Free</CTAButton>
 * ```
 */
function CTAButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-8 flex justify-center">
      <Button asChild size="lg" className="shadow-glow-cyan">
        <Link href={href}>{children}</Link>
      </Button>
    </div>
  );
}

/**
 * Custom link component
 */
function CustomLink({
  href,
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const isExternal = href?.startsWith("http");
  if (isExternal) {
    return (
      <a
        href={href}
        className="text-primary hover:underline transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href || "#"}
      className="text-primary hover:underline transition-colors"
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Custom code component
 */
function CustomCode({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  const isInline = !className;
  if (isInline) {
    return (
      <code
        className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded"
        {...props}
      >
        {children}
      </code>
    );
  }
  return (
    <code className="font-mono text-sm" {...props}>
      {children}
    </code>
  );
}

/**
 * Custom image component
 */
function CustomImage({ src, alt }: { src?: string; alt?: string; }) {
  if (!src || typeof src !== "string") {
    return null;
  }
  return (
    <span className="block my-6">
      <Image
        src={src}
        alt={alt || ""}
        width={1200}
        height={675}
        className="rounded-lg w-full h-auto"
      />
    </span>
  );
}

/**
 * Custom components available in MDX blog posts
 * These override default HTML elements with styled versions
 */
export const mdxComponents: MDXComponents = {
  // Headings with Montserrat font
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className="font-heading text-4xl font-bold mt-12 mb-6 text-foreground"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="font-heading text-3xl font-bold mt-10 mb-4 text-foreground"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="font-heading text-2xl font-semibold mt-8 mb-3 text-foreground"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className="font-heading text-xl font-semibold mt-6 mb-2 text-foreground"
      {...props}
    >
      {children}
    </h4>
  ),

  // Paragraphs with proper line height
  p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p className="text-foreground leading-relaxed mb-6" {...props}>
      {children}
    </p>
  ),

  // Links with Pixel Cyan color
  a: CustomLink,

  // Lists
  ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="list-disc list-inside space-y-2 mb-6 text-foreground"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="list-decimal list-inside space-y-2 mb-6 text-foreground"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // Blockquotes
  blockquote: ({
    children,
    ...props
  }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-l-4 border-primary pl-4 py-2 my-6 text-muted-foreground italic"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code blocks
  pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="bg-card rounded-lg p-4 overflow-x-auto my-6 border border-border"
      {...props}
    >
      {children}
    </pre>
  ),
  code: CustomCode,

  // Horizontal rule
  hr: () => <hr className="my-8 border-border" />,

  // Strong/bold
  strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-bold text-foreground" {...props}>
      {children}
    </strong>
  ),

  // Emphasis/italic
  em: ({ children, ...props }: ComponentPropsWithoutRef<"em">) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // Images with Next.js Image component
  img: CustomImage,

  // Custom components for MDX
  ImageComparisonSlider,
  SplitPreview,
  Button,
  Callout,
  Gallery,
  CTAButton,
  ImagePlaceholder,
};

/**
 * Returns MDX components with optional overrides.
 * Use this function to get the default MDX components with additional
 * or custom component implementations.
 *
 * @param overrides - Optional object of components to override or add
 * @returns The merged MDX components object
 *
 * @example
 * ```tsx
 * const components = getMDXComponents({
 *   CustomComponent: MyCustomComponent,
 * });
 * ```
 */
export function getMDXComponents(
  overrides: MDXComponents = {},
): MDXComponents {
  return {
    ...mdxComponents,
    ...overrides,
  };
}
