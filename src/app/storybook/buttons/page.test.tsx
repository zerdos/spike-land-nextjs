import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ButtonsPage from "./page";

describe("ButtonsPage", () => {
  describe("rendering", () => {
    it("should render the main title", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Buttons")).toBeInTheDocument();
    });

    it("should render the accessibility section", () => {
      render(<ButtonsPage />);
      expect(screen.getByText(/Accessibility \(WCAG AA\)/i))
        .toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("should render primary button sample", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
      expect(screen.getByText("Primary Action")).toBeInTheDocument();
    });

    it("should render style variants section", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Style Variants")).toBeInTheDocument();
    });

    it("should render all semantic variants", () => {
      render(<ButtonsPage />);
      expect(screen.getByRole("button", { name: /delete project/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /publish changes/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /top up tokens/i }))
        .toBeInTheDocument();
    });
  });

  describe("states", () => {
    it("should render interaction states section", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Interaction States")).toBeInTheDocument();
    });

    it("should render disabled buttons", () => {
      render(<ButtonsPage />);
      expect(screen.getByText("Disabled State")).toBeInTheDocument();
      const disabledButtons = screen.getAllByRole("button").filter((b) =>
        (b as HTMLButtonElement).disabled
      );
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });
});
