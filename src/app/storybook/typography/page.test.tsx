import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TypographyPage from "./page";

describe("TypographyPage", () => {
  describe("rendering", () => {
    it("should render the main title", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Typography")).toBeInTheDocument();
    });

    it("should render the page description", () => {
      render(<TypographyPage />);
      expect(
        screen.getByText(
          /Our typography system is designed for maximum legibility/i,
        ),
      )
        .toBeInTheDocument();
    });
  });

  describe("font stack", () => {
    it("should render the font stack section", () => {
      render(<TypographyPage />);
      expect(screen.getByText("The Font Stack")).toBeInTheDocument();
    });

    it("should display Montserrat as heading typeface", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Heading Typeface")).toBeInTheDocument();
      expect(screen.getByText("Montserrat")).toBeInTheDocument();
    });

    it("should display Geist Sans as interface typeface", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Interface Typeface")).toBeInTheDocument();
      expect(screen.getByText("Geist Sans")).toBeInTheDocument();
    });
  });

  describe("scale", () => {
    it("should render the scale section", () => {
      render(<TypographyPage />);
      expect(screen.getByText("The Scale")).toBeInTheDocument();
    });

    it("should render top level headings", () => {
      render(<TypographyPage />);
      expect(screen.getByRole("heading", { name: /Ultimate Enhancement/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /System Performance/i }))
        .toBeInTheDocument();
    });

    it("should render section level headings", () => {
      render(<TypographyPage />);
      expect(screen.getByRole("heading", { name: /Core Components/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Interactive Elements/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Status Indicators/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Inline Meta Data/i }))
        .toBeInTheDocument();
    });
  });

  describe("semantic hierarchy", () => {
    it("should render semantic hierarchy section", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Semantic Hierarchy")).toBeInTheDocument();
    });

    it("should display color examples", () => {
      render(<TypographyPage />);
      expect(screen.getByText("Primary Foreground")).toBeInTheDocument();
      expect(screen.getByText(/Secondary Foreground \(Muted\)/i))
        .toBeInTheDocument();
    });

    it("should display state color examples", () => {
      render(<TypographyPage />);
      expect(screen.getByText(/System ready for deployment/i))
        .toBeInTheDocument();
      expect(screen.getByText(/Token balance low/i)).toBeInTheDocument();
      expect(screen.getByText(/Critical engine failure/i)).toBeInTheDocument();
    });
  });
});
