import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the MDXRemote component to avoid serialization issues in tests
vi.mock("next-mdx-remote", () => ({
  MDXRemote: ({
    compiledSource,
    components,
  }: {
    compiledSource: string;
    components: Record<string, unknown>;
  }) => (
    <div data-testid="mdx-remote">
      <span data-testid="compiled-source">{compiledSource}</span>
      <span data-testid="has-components">
        {Object.keys(components || {}).length > 0 ? "yes" : "no"}
      </span>
    </div>
  ),
}));

// Mock the MDX components module
vi.mock("./MDXComponents", () => ({
  mdxComponents: {
    h1: "h1",
    h2: "h2",
    p: "p",
    a: "a",
    Callout: "div",
    Gallery: "div",
    CTAButton: "button",
    ImageComparisonSlider: "div",
  },
}));

import { MDXContent } from "./MDXContent";

describe("MDXContent", () => {
  const mockSource = {
    compiledSource: "compiled MDX content",
    scope: {},
    frontmatter: {},
  };

  it("renders MDXRemote with source", () => {
    render(<MDXContent source={mockSource} />);

    expect(screen.getByTestId("mdx-remote")).toBeInTheDocument();
    expect(screen.getByTestId("compiled-source")).toHaveTextContent(
      "compiled MDX content",
    );
  });

  it("passes mdxComponents to MDXRemote", () => {
    render(<MDXContent source={mockSource} />);

    expect(screen.getByTestId("has-components")).toHaveTextContent("yes");
  });

  it("renders without crashing with empty source", () => {
    const emptySource = {
      compiledSource: "",
      scope: {},
      frontmatter: {},
    };

    render(<MDXContent source={emptySource} />);

    expect(screen.getByTestId("mdx-remote")).toBeInTheDocument();
  });
});
