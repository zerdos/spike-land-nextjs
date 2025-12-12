import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppsLayout from "./layout";

describe("AppsLayout", () => {
  const mockChildren = <div data-testid="child-content">Test Content</div>;

  describe("Pass-through Layout", () => {
    it("should render without crashing", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should not add wrapper elements", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      // The first element should be the child content directly
      expect(container.querySelector('[data-testid="child-content"]')).toBeInTheDocument();
    });
  });

  describe("Children Rendering", () => {
    it("should render single child element", () => {
      render(
        <AppsLayout>
          <div>Single Child</div>
        </AppsLayout>,
      );
      expect(screen.getByText("Single Child")).toBeInTheDocument();
    });

    it("should render multiple child elements", () => {
      render(
        <AppsLayout>
          <div>First Child</div>
          <div>Second Child</div>
        </AppsLayout>,
      );
      expect(screen.getByText("First Child")).toBeInTheDocument();
      expect(screen.getByText("Second Child")).toBeInTheDocument();
    });

    it("should render complex nested children", () => {
      render(
        <AppsLayout>
          <div>
            <span>Nested</span>
            <div>Content</div>
          </div>
        </AppsLayout>,
      );
      expect(screen.getByText("Nested")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("should preserve children structure", () => {
      const { container } = render(
        <AppsLayout>
          <section data-testid="test-section">
            <article data-testid="test-article">Content</article>
          </section>
        </AppsLayout>,
      );
      expect(container.querySelector('[data-testid="test-section"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="test-article"]')).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty children", () => {
      const { container } = render(<AppsLayout>{null}</AppsLayout>);
      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it("should handle text-only children", () => {
      render(<AppsLayout>Plain text content</AppsLayout>);
      expect(screen.getByText("Plain text content")).toBeInTheDocument();
    });

    it("should handle fragment children", () => {
      render(
        <AppsLayout>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </AppsLayout>,
      );
      expect(screen.getByText("Fragment Child 1")).toBeInTheDocument();
      expect(screen.getByText("Fragment Child 2")).toBeInTheDocument();
    });
  });
});
