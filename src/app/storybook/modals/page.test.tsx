import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock EnhancementSettings component
vi.mock("@/components/enhance/EnhancementSettings", () => ({
  EnhancementSettings: ({ trigger }: { trigger: React.ReactNode; }) => (
    <div data-testid="enhancement-settings">{trigger}</div>
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

import ModalsPage from "./page";

describe("ModalsPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<ModalsPage />);
      expect(screen.getByText("Modal Components")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<ModalsPage />);
      expect(
        screen.getByText(/dialog, sheet, and alert dialog components/i),
      ).toBeInTheDocument();
    });
  });

  describe("enhancement settings dialog section", () => {
    it("should render enhancement settings dialog card", () => {
      render(<ModalsPage />);
      expect(screen.getByText("Enhancement Settings Dialog")).toBeInTheDocument();
      expect(
        screen.getByText(/modal dialog with card-based tier selection for image enhancement/i),
      ).toBeInTheDocument();
    });

    it("should render EnhancementSettings component with trigger", () => {
      render(<ModalsPage />);
      expect(screen.getByTestId("enhancement-settings")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /open enhancement settings/i }))
        .toBeInTheDocument();
    });
  });

  describe("sheet section", () => {
    it("should render sheet card", () => {
      render(<ModalsPage />);
      expect(screen.getByText("Sheet")).toBeInTheDocument();
      expect(screen.getByText(/slide-out panel for navigation or settings/i)).toBeInTheDocument();
    });

    it("should render sheet trigger button", () => {
      render(<ModalsPage />);
      expect(screen.getByRole("button", { name: /open sheet \(right\)/i })).toBeInTheDocument();
    });
  });

  describe("alert dialog section", () => {
    it("should render alert dialog card", () => {
      render(<ModalsPage />);
      expect(screen.getByText("Alert Dialog")).toBeInTheDocument();
      expect(
        screen.getByText(/confirmation dialog for destructive actions/i),
      ).toBeInTheDocument();
    });

    it("should render alert dialog trigger button", () => {
      render(<ModalsPage />);
      expect(screen.getByRole("button", { name: /delete image/i })).toBeInTheDocument();
    });
  });
});
