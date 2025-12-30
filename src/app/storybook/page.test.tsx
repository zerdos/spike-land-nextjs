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
    it("should render the main branding", () => {
      render(<StorybookPage />);
      expect(screen.getByRole("heading", { name: /spike\.land/i }))
        .toBeInTheDocument();
    });

    it("should render the page description", () => {
      render(<StorybookPage />);
      expect(
        screen.getByText(
          /design system & component library for ai-powered creative tools/i,
        ),
      )
        .toBeInTheDocument();
    });

    it("should render footer content", () => {
      render(<StorybookPage />);
      expect(screen.getByText(/stable version 1\.2\.0/i)).toBeInTheDocument();
      expect(screen.getByText(/built for spike land platform/i))
        .toBeInTheDocument();
    });
  });

  describe("section cards", () => {
    it("should render section links", () => {
      render(<StorybookPage />);
      const links = screen.getAllByRole("link");
      const sectionLinks = links.filter((link) =>
        link.getAttribute("href")?.startsWith("/storybook/")
      );
      // We have multiple sections, let's just check they exist
      expect(sectionLinks.length).toBeGreaterThan(0);
    });

    it("should display core section titles", () => {
      render(<StorybookPage />);
      expect(screen.getByText("Brand")).toBeInTheDocument();
      expect(screen.getByText("Colors")).toBeInTheDocument();
      expect(screen.getByText("Typography")).toBeInTheDocument();
      expect(screen.getByText("Buttons")).toBeInTheDocument();
      expect(screen.getByText("Components")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<StorybookPage />);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/spike\.land/i);
    });
  });
});
