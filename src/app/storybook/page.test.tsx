import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import StorybookPage from "./page";

describe("StorybookPage (Overview)", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      render(<StorybookPage />);
      expect(screen.getByRole("heading", { name: /design system/i }))
        .toBeInTheDocument();
    });

    it("should render the page description", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/pixel brand guidelines & component library/i))
        .toBeInTheDocument();
    });

    it("should render footer content", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/pixel design system v1\.0/i))
        .toBeInTheDocument();
      expect(screen.getByText(/part of the spike land platform/i))
        .toBeInTheDocument();
    });
  });

  describe("section cards", () => {
    it("should render all 14 section links", () => {
      render(<StorybookPage />);
      const links = screen.getAllByRole("link");
      // Filter links that point to storybook sections
      const sectionLinks = links.filter((link) =>
        link.getAttribute("href")?.startsWith("/storybook/")
      );
      expect(sectionLinks).toHaveLength(14);
    });

    it("should have correct links to section pages", () => {
      render(<StorybookPage />);
      // Check specific hrefs exist
      const links = screen.getAllByRole("link");
      const hrefs = links.map((link) => link.getAttribute("href"));

      expect(hrefs).toContain("/storybook/brand");
      expect(hrefs).toContain("/storybook/colors");
      expect(hrefs).toContain("/storybook/typography");
      expect(hrefs).toContain("/storybook/buttons");
      expect(hrefs).toContain("/storybook/components");
      expect(hrefs).toContain("/storybook/data-display");
      expect(hrefs).toContain("/storybook/layout");
      expect(hrefs).toContain("/storybook/comparison");
      expect(hrefs).toContain("/storybook/feedback");
      expect(hrefs).toContain("/storybook/loading");
      expect(hrefs).toContain("/storybook/modals");
      expect(hrefs).toContain("/storybook/accessibility");
    });

    it("should display section titles", () => {
      render(<StorybookPage />);
      expect(screen.getByText("Brand")).toBeInTheDocument();
      expect(screen.getByText("Colors")).toBeInTheDocument();
      expect(screen.getByText("Typography")).toBeInTheDocument();
      expect(screen.getByText("Buttons")).toBeInTheDocument();
      expect(screen.getByText("Components")).toBeInTheDocument();
      expect(screen.getByText("Data Display")).toBeInTheDocument();
      expect(screen.getByText("Layout")).toBeInTheDocument();
      expect(screen.getByText("Comparison")).toBeInTheDocument();
      expect(screen.getByText("Feedback")).toBeInTheDocument();
      expect(screen.getByText("Loading")).toBeInTheDocument();
      expect(screen.getByText("Modals")).toBeInTheDocument();
      expect(screen.getByText("Accessibility")).toBeInTheDocument();
    });

    it("should display section descriptions", () => {
      render(<StorybookPage />);
      expect(
        screen.getByText(/logo variants, sizes, and the pixel ai spark logo/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/color palette, brand colors, dark\/light modes/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/font families, heading scale, text colors/i))
        .toBeInTheDocument();
      expect(
        screen.getByText(/button variants, sizes, states, loading indicators/i),
      ).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<StorybookPage />);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/design system/i);
    });
  });
});
