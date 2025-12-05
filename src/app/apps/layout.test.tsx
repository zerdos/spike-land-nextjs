import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppsLayout from "./layout";

describe("AppsLayout", () => {
  const mockChildren = <div data-testid="child-content">Test Content</div>;

  describe("Layout Structure", () => {
    it("should render without crashing", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should render main layout container", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const mainContainer = container.querySelector(".min-h-screen");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should have full height screen layout", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("min-h-screen");
    });

    it("should render header element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = document.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("should render main element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = document.querySelector("main");
      expect(main).toBeInTheDocument();
    });
  });

  describe("Header Section", () => {
    it("should render header with border", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header.border-b");
      expect(header).toBeInTheDocument();
    });

    it("should render header with container", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerContainer = within(header!).getByRole("heading", { level: 1 }).parentElement;
      expect(headerContainer).toHaveClass("container");
    });

    it("should have proper header padding", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerContainer = header?.querySelector(".py-6");
      expect(headerContainer).toBeInTheDocument();
    });

    it("should render applications heading", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const heading = screen.getByRole("heading", { name: "Applications", level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should render header description", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/Discover and explore our curated collection of interactive apps/i))
        .toBeInTheDocument();
    });

    it("should have proper styling on heading", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const heading = screen.getByRole("heading", { name: "Applications", level: 1 });
      expect(heading).toHaveClass("text-3xl", "font-bold");
    });

    it("should have muted foreground color on description", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const description = container.querySelector(".text-muted-foreground");
      expect(description).toBeInTheDocument();
    });

    it("should have proper margin on description", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const description = container.querySelector(".mt-2");
      expect(description?.textContent).toContain("Discover and explore");
    });
  });

  describe("Main Content Section", () => {
    it("should render main as semantic element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = document.querySelector("main");
      expect(main?.tagName).toBe("MAIN");
    });

    it("should render main with container class", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = container.querySelector("main.container");
      expect(main).toBeInTheDocument();
    });

    it("should have proper horizontal padding on main", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = container.querySelector("main.px-4");
      expect(main).toBeInTheDocument();
    });

    it("should have proper vertical padding on main", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = container.querySelector("main.py-8");
      expect(main).toBeInTheDocument();
    });

    it("should have centered content with mx-auto", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = container.querySelector("main.mx-auto");
      expect(main).toBeInTheDocument();
    });

    it("should render children inside main element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = document.querySelector("main");
      expect(within(main!).getByTestId("child-content")).toBeInTheDocument();
    });
  });

  describe("Container Styling", () => {
    it("should apply container class to header content", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerInner = header?.querySelector(".container");
      expect(headerInner).toBeInTheDocument();
    });

    it("should have horizontal padding on header container", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerInner = header?.querySelector(".px-4");
      expect(headerInner).toBeInTheDocument();
    });

    it("should center header content with mx-auto", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerInner = header?.querySelector(".mx-auto");
      expect(headerInner).toBeInTheDocument();
    });
  });

  describe("Typography", () => {
    it("should use 3xl text size for heading", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const heading = screen.getByRole("heading", { name: "Applications", level: 1 });
      expect(heading).toHaveClass("text-3xl");
    });

    it("should use bold font weight for heading", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const heading = screen.getByRole("heading", { name: "Applications", level: 1 });
      expect(heading).toHaveClass("font-bold");
    });

    it("should display heading text correctly", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText("Applications")).toBeInTheDocument();
    });

    it("should display description text correctly", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/curated collection/i)).toBeInTheDocument();
    });
  });

  describe("Layout Composition", () => {
    it("should render header before main", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const main = container.querySelector("main");
      const parent = header?.parentElement;
      const children = Array.from(parent?.children || []);
      const headerIndex = children.indexOf(header!);
      const mainIndex = children.indexOf(main!);
      expect(headerIndex).toBeLessThan(mainIndex);
    });

    it("should have exactly one header", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const headers = container.querySelectorAll("header");
      expect(headers).toHaveLength(1);
    });

    it("should have exactly one main", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const mains = container.querySelectorAll("main");
      expect(mains).toHaveLength(1);
    });

    it("should have exactly one h1 heading", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const h1s = container.querySelectorAll("h1");
      expect(h1s).toHaveLength(1);
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

  describe("Accessibility", () => {
    it("should have proper heading hierarchy starting with h1", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();
      expect(h1?.textContent).toBe("Applications");
    });

    it("should use semantic header element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = document.querySelector("header");
      expect(header?.tagName).toBe("HEADER");
    });

    it("should use semantic main element", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = document.querySelector("main");
      expect(main?.tagName).toBe("MAIN");
    });

    it("should have descriptive heading text", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toBeTruthy();
      expect(heading.textContent?.length).toBeGreaterThan(0);
    });

    it("should have descriptive subheading text", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const description = screen.getByText(/Discover and explore/i);
      expect(description.textContent).toBeTruthy();
      expect(description.textContent?.length).toBeGreaterThan(0);
    });
  });

  describe("Spacing and Layout", () => {
    it("should have consistent horizontal padding", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const elementsWithPx4 = container.querySelectorAll(".px-4");
      expect(elementsWithPx4.length).toBeGreaterThan(0);
    });

    it("should have proper vertical spacing in header", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      const headerInner = header?.querySelector(".py-6");
      expect(headerInner).toBeInTheDocument();
    });

    it("should have proper vertical spacing in main", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const main = container.querySelector("main.py-8");
      expect(main).toBeInTheDocument();
    });

    it("should have margin top on description", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      const description = screen.getByText(/Discover and explore/i);
      expect(description).toHaveClass("mt-2");
    });
  });

  describe("Border Styling", () => {
    it("should have bottom border on header", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header");
      expect(header).toHaveClass("border-b");
    });

    it("should separate header from content with border", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const header = container.querySelector("header.border-b");
      expect(header).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should use container class for responsive width", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const containers = container.querySelectorAll(".container");
      expect(containers.length).toBeGreaterThan(0);
    });

    it("should center content with mx-auto", () => {
      const { container } = render(<AppsLayout>{mockChildren}</AppsLayout>);
      const centeredElements = container.querySelectorAll(".mx-auto");
      expect(centeredElements.length).toBeGreaterThan(0);
    });
  });

  describe("Content Description", () => {
    it("should mention discovery in description", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/Discover/i)).toBeInTheDocument();
    });

    it("should mention exploration in description", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/explore/i)).toBeInTheDocument();
    });

    it("should mention curated collection", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/curated collection/i)).toBeInTheDocument();
    });

    it("should mention interactive apps", () => {
      render(<AppsLayout>{mockChildren}</AppsLayout>);
      expect(screen.getByText(/interactive apps/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty children", () => {
      render(<AppsLayout>{null}</AppsLayout>);
      expect(screen.getByText("Applications")).toBeInTheDocument();
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
