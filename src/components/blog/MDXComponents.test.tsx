import { render, screen } from "@testing-library/react";
import { mdxComponents, getMDXComponents } from "./MDXComponents";
import { vi } from "vitest";

// Mocks for dynamic components
vi.mock("next/dynamic", () => ({
  default: () => {
    const MockComponent = () => <div data-testid="dynamic-component" />;
    return MockComponent;
  },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="next-image" />,
}));

describe("MDXComponents", () => {
  it("renders headings correctly", () => {
    const H1 = mdxComponents.h1 as any;
    render(<H1>Heading 1</H1>);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Heading 1");
    expect(heading).toHaveClass("font-heading");
  });

  it("renders custom link correctly", () => {
    const LinkComponent = mdxComponents.a as any;
    render(<LinkComponent href="https://example.com">External Link</LinkComponent>);
    const link = screen.getByRole("link", { name: "External Link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders internal link correctly", () => {
     const LinkComponent = mdxComponents.a as any;
     render(<LinkComponent href="/internal">Internal Link</LinkComponent>);
     const link = screen.getByRole("link", { name: "Internal Link" });
     expect(link).toHaveAttribute("href", "/internal");
     expect(link).not.toHaveAttribute("target");
  });

  it("renders Callout component", () => {
    const Callout = mdxComponents.Callout as any;
    render(<Callout type="info">Info Text</Callout>);
    expect(screen.getByText("Info Text")).toBeInTheDocument();
  });

  it("renders Gallery component", () => {
    const Gallery = mdxComponents.Gallery as any;
    render(
      <Gallery>
        <div>Image 1</div>
        <div>Image 2</div>
      </Gallery>
    );
    expect(screen.getByText("Image 1")).toBeInTheDocument();
    expect(screen.getByText("Image 2")).toBeInTheDocument();
  });

  it("renders CTAButton component", () => {
    const CTAButton = mdxComponents.CTAButton as any;
    render(<CTAButton href="/signup">Sign Up</CTAButton>);
    const button = screen.getByRole("link", { name: "Sign Up" });
    expect(button).toHaveAttribute("href", "/signup");
  });

  it("renders blockquote correctly", () => {
    const Blockquote = mdxComponents.blockquote as any;
    render(<Blockquote>Quote</Blockquote>);
    expect(screen.getByText("Quote")).toBeInTheDocument();
    expect(screen.getByText("Quote").tagName).toBe("BLOCKQUOTE");
  });

  it("renders custom code block", () => {
    const Code = mdxComponents.code as any;
    render(<Code className="language-js">console.log()</Code>);
    expect(screen.getByText("console.log()")).toHaveClass("font-mono");
  });

  it("renders inline code", () => {
    const Code = mdxComponents.code as any;
    render(<Code>var x</Code>);
    expect(screen.getByText("var x")).toHaveClass("bg-muted");
  });

  it("getMDXComponents returns merged components", () => {
    const CustomComp = () => <div>Custom</div>;
    const components = getMDXComponents({ CustomComp });
    expect(components.CustomComp).toBeDefined();
    expect(components.h1).toBeDefined();
  });
});
