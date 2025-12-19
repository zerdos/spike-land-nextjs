import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TypographyPage from "./page";

describe("TypographyPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Typography")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/font families and text styles/i))
        .toBeInTheDocument();
    });
  });

  describe("font families section", () => {
    it("should render font families card", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Font Families")).toBeInTheDocument();
      expect(screen.getByText(/montserrat for headers, geist for body/i))
        .toBeInTheDocument();
    });

    it("should display Montserrat font example", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/montserrat \(headers\)/i)).toBeInTheDocument();
    });

    it("should display Geist Sans font example", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/geist sans \(body\)/i)).toBeInTheDocument();
    });

    it("should display Geist Mono font example", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/geist mono \(code\)/i)).toBeInTheDocument();
    });
  });

  describe("heading scale section", () => {
    it("should render heading scale card", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Heading Scale")).toBeInTheDocument();
      expect(screen.getByText(/all headings use montserrat font/i))
        .toBeInTheDocument();
    });

    it("should render all heading levels", () => {
      render(<TypographyPage />);
      expect(screen.getByRole("heading", { name: /heading level 1/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /heading level 2/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /heading level 3/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /heading level 4/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /heading level 5/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /heading level 6/i }))
        .toBeInTheDocument();
    });

    it("should render heading level badges", () => {
      render(<TypographyPage />);
      expect(screen.getByText("h1")).toBeInTheDocument();
      expect(screen.getByText("h2")).toBeInTheDocument();
      expect(screen.getByText("h3")).toBeInTheDocument();
      expect(screen.getByText("h4")).toBeInTheDocument();
      expect(screen.getByText("h5")).toBeInTheDocument();
      expect(screen.getByText("h6")).toBeInTheDocument();
    });
  });

  describe("text colors section", () => {
    it("should render text colors card", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Text Colors")).toBeInTheDocument();
      expect(screen.getByText(/semantic text color classes/i))
        .toBeInTheDocument();
    });

    it("should display text color examples", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/text-foreground - primary text/i))
        .toBeInTheDocument();
      expect(screen.getByText(/text-muted-foreground - secondary text/i))
        .toBeInTheDocument();
      expect(screen.getByText(/text-primary - accent\/link text/i))
        .toBeInTheDocument();
      expect(screen.getByText(/text-destructive - error text/i))
        .toBeInTheDocument();
    });
  });
});
