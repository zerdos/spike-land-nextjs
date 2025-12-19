import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataDisplayPage from "./page";

describe("DataDisplayPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Data Display")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText(/components for displaying structured data/i))
        .toBeInTheDocument();
    });
  });

  describe("table section", () => {
    it("should render table card", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Table")).toBeInTheDocument();
      expect(screen.getByText(/display tabular data with headers and rows/i))
        .toBeInTheDocument();
    });

    it("should render token packages table", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Token Packages")).toBeInTheDocument();
      expect(screen.getByText("Starter")).toBeInTheDocument();
      // "Pro" appears multiple times (table + toggle group)
      const proElements = screen.getAllByText("Pro");
      expect(proElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("should render enhancement history table", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Enhancement History")).toBeInTheDocument();
      expect(screen.getByText("ENH-001")).toBeInTheDocument();
    });
  });

  describe("toggle group section", () => {
    it("should render toggle group card", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Toggle Group")).toBeInTheDocument();
      expect(screen.getByText(/single or multiple selection toggle buttons/i))
        .toBeInTheDocument();
    });

    it("should render view mode toggle", () => {
      render(<DataDisplayPage />);
      expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
      expect(screen.getByLabelText("List view")).toBeInTheDocument();
      expect(screen.getByLabelText("Gallery view")).toBeInTheDocument();
    });

    it("should render text alignment toggle", () => {
      render(<DataDisplayPage />);
      expect(screen.getByLabelText("Align left")).toBeInTheDocument();
      expect(screen.getByLabelText("Align center")).toBeInTheDocument();
      expect(screen.getByLabelText("Align right")).toBeInTheDocument();
    });
  });

  describe("copy button section", () => {
    it("should render copy button card", () => {
      render(<DataDisplayPage />);
      expect(screen.getByText("Copy Button")).toBeInTheDocument();
      expect(
        screen.getByText(/click-to-copy functionality with visual feedback/i),
      )
        .toBeInTheDocument();
    });

    it("should render copy buttons", () => {
      render(<DataDisplayPage />);
      const copyButtons = screen.getAllByText("Copy");
      expect(copyButtons.length).toBeGreaterThan(0);
    });
  });
});
