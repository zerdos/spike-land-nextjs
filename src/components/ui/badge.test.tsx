import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge Component", () => {
  describe("Rendering", () => {
    it("should render with default variant", () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText("Default Badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("glass-1");
      expect(badge).toHaveClass("glass-edge");
      expect(badge).toHaveClass("text-foreground");
    });

    it("should render with secondary variant", () => {
      render(<Badge variant="secondary">Secondary Badge</Badge>);
      const badge = screen.getByText("Secondary Badge");
      expect(badge).toHaveClass("bg-white/5");
      expect(badge).toHaveClass("text-muted-foreground");
    });

    it("should render with destructive variant", () => {
      render(<Badge variant="destructive">Destructive Badge</Badge>);
      const badge = screen.getByText("Destructive Badge");
      expect(badge).toHaveClass("bg-destructive");
      expect(badge).toHaveClass("text-destructive-foreground");
    });

    it("should render with outline variant", () => {
      render(<Badge variant="outline">Outline Badge</Badge>);
      const badge = screen.getByText("Outline Badge");
      expect(badge).toHaveClass("text-foreground");
      expect(badge).not.toHaveClass("bg-primary");
    });

    it("should render children correctly", () => {
      render(<Badge>Test Content</Badge>);
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("should accept custom className", () => {
      render(<Badge className="custom-class">Custom Badge</Badge>);
      const badge = screen.getByText("Custom Badge");
      expect(badge).toHaveClass("custom-class");
    });

    it("should merge custom classes with variant classes", () => {
      render(
        <Badge variant="secondary" className="custom-spacing">
          Custom Badge
        </Badge>,
      );
      const badge = screen.getByText("Custom Badge");
      expect(badge).toHaveClass("bg-white/5");
      expect(badge).toHaveClass("custom-spacing");
    });
  });

  describe("HTML Attributes", () => {
    it("should accept and apply custom HTML attributes", () => {
      render(
        <Badge data-testid="test-badge" id="badge-id">
          Badge with Attributes
        </Badge>,
      );
      const badge = screen.getByTestId("test-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("id", "badge-id");
    });

    it("should support aria attributes", () => {
      render(<Badge aria-label="status badge">Status</Badge>);
      const badge = screen.getByLabelText("status badge");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Base Styles", () => {
    it("should have default badge styles", () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-1");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("font-semibold");
    });
  });
});
