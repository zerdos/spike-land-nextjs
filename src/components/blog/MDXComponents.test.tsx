import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { getMDXComponents, mdxComponents } from "./MDXComponents";

// Mocks for dynamic components
vi.mock("next/dynamic", () => ({
  default: () => {
    const MockComponent = () => <div data-testid="dynamic-component" />;
    return MockComponent;
  },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

describe("MDXComponents", () => {
  it("renders headings correctly", () => {
    const H1 = mdxComponents["h1"] as any;
    render(<H1>Heading 1</H1>);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Heading 1");
    expect(heading).toHaveClass("font-heading");
  });

  it("renders custom link correctly", () => {
    const LinkComponent = mdxComponents["a"] as any;
    render(
      <LinkComponent href="https://example.com">External Link</LinkComponent>,
    );
    const link = screen.getByRole("link", { name: "External Link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders internal link correctly", () => {
    const LinkComponent = mdxComponents["a"] as any;
    render(<LinkComponent href="/internal">Internal Link</LinkComponent>);
    const link = screen.getByRole("link", { name: "Internal Link" });
    expect(link).toHaveAttribute("href", "/internal");
    expect(link).not.toHaveAttribute("target");
  });

  it("renders Callout component", () => {
    const Callout = mdxComponents["Callout"] as any;
    render(<Callout type="info">Info Text</Callout>);
    expect(screen.getByText("Info Text")).toBeInTheDocument();
  });

  it("renders Gallery component", () => {
    const Gallery = mdxComponents["Gallery"] as any;
    render(
      <Gallery>
        <div>Image 1</div>
        <div>Image 2</div>
      </Gallery>,
    );
    expect(screen.getByText("Image 1")).toBeInTheDocument();
    expect(screen.getByText("Image 2")).toBeInTheDocument();
  });

  it("renders CTAButton component", () => {
    const CTAButton = mdxComponents["CTAButton"] as any;
    render(<CTAButton href="/signup">Sign Up</CTAButton>);
    const button = screen.getByRole("link", { name: "Sign Up" });
    expect(button).toHaveAttribute("href", "/signup");
  });

  it("renders blockquote correctly", () => {
    const Blockquote = mdxComponents["blockquote"] as any;
    render(<Blockquote>Quote</Blockquote>);
    expect(screen.getByText("Quote")).toBeInTheDocument();
    const blockquote = screen.getByText("Quote").closest("blockquote");
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveClass("flex", "items-center");
  });

  it("renders custom code block", () => {
    const Code = mdxComponents["code"] as any;
    render(<Code className="language-js">console.log()</Code>);
    expect(screen.getByText("console.log()")).toHaveClass("font-mono");
  });

  it("renders inline code", () => {
    const Code = mdxComponents["code"] as any;
    render(<Code>var x</Code>);
    expect(screen.getByText("var x")).toHaveClass("bg-muted");
  });

  it("getMDXComponents returns merged components", () => {
    const CustomComp = () => <div>Custom</div>;
    const components = getMDXComponents({ CustomComp });
    expect(components["CustomComp"]).toBeDefined();
    expect(components["h1"]).toBeDefined();
  });

  describe("Table components", () => {
    it("renders table with overflow wrapper", () => {
      const Table = mdxComponents["table"] as any;
      render(<Table data-testid="table">Table content</Table>);
      const table = screen.getByTestId("table");
      expect(table).toHaveClass("w-full", "border-collapse");
      expect(table.parentElement).toHaveClass("overflow-x-auto");
    });

    it("renders thead with muted background", () => {
      const Thead = mdxComponents["thead"] as any;
      render(<Thead>Header content</Thead>);
      expect(screen.getByText("Header content")).toHaveClass("bg-muted/50");
    });

    it("renders tbody with dividers", () => {
      const Tbody = mdxComponents["tbody"] as any;
      render(<Tbody>Body content</Tbody>);
      expect(screen.getByText("Body content")).toHaveClass("divide-y", "divide-border");
    });

    it("renders tr with hover state", () => {
      const Tr = mdxComponents["tr"] as any;
      render(<Tr>Row content</Tr>);
      expect(screen.getByText("Row content")).toHaveClass("hover:bg-muted/30");
    });

    it("renders th with proper styling", () => {
      const Th = mdxComponents["th"] as any;
      render(<Th>Header cell</Th>);
      const th = screen.getByText("Header cell");
      expect(th).toHaveClass("px-4", "py-3", "font-semibold");
    });

    it("renders td with proper styling", () => {
      const Td = mdxComponents["td"] as any;
      render(<Td>Data cell</Td>);
      const td = screen.getByText("Data cell");
      expect(td).toHaveClass("px-4", "py-3");
    });
  });
  describe("AudioPlayer", () => {
    it("renders with correct sources", () => {
      const AudioPlayer = mdxComponents["AudioPlayer"] as any;
      render(<AudioPlayer src="/test.m4a" title="Test Audio" />);

      const audio = screen.getByText("Your browser does not support the audio element.").closest(
        "audio",
      );
      expect(audio).toBeInTheDocument();
      expect(screen.getByText("Test Audio")).toBeInTheDocument();

      const sources = audio?.querySelectorAll("source");
      expect(sources).toHaveLength(2);
      expect(sources?.[0]).toHaveAttribute("src", "/test.m4a");
    });
  });

  describe("YouTubeEmbed", () => {
    it("renders iframe with validated src", () => {
      const YouTubeEmbed = mdxComponents["YouTubeEmbed"] as any;
      render(<YouTubeEmbed videoId="test-id" title="Test Video" />);

      const iframe = screen.getByTitle("Test Video");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/test-id");
    });

    it("sanitizes malicious videoId", () => {
      const YouTubeEmbed = mdxComponents["YouTubeEmbed"] as any;
      // Provide videoId with disallowed characters
      render(<YouTubeEmbed videoId="test<script>" title="Test Video" />);

      const iframe = screen.getByTitle("Test Video");
      // < and > should be removed
      expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/testscript");
    });
  });
});
