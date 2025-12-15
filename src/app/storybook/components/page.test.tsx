import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComponentsPage from "./page";

describe("ComponentsPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Components")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<ComponentsPage />);
      expect(screen.getByText(/ui component library showcase/i)).toBeInTheDocument();
    });
  });

  describe("cards section", () => {
    it("should render cards card", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Cards")).toBeInTheDocument();
      expect(screen.getByText(/container components with glass-morphism/i)).toBeInTheDocument();
    });

    it("should render different card variants", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Default Card")).toBeInTheDocument();
      expect(screen.getByText("Highlighted Card")).toBeInTheDocument();
      expect(screen.getByText("Dashed Card")).toBeInTheDocument();
    });
  });

  describe("badges section", () => {
    it("should render badges card", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Badges")).toBeInTheDocument();
      expect(screen.getByText(/small status indicators/i)).toBeInTheDocument();
    });

    it("should render badge variants", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Default")).toBeInTheDocument();
      expect(screen.getByText("Secondary")).toBeInTheDocument();
      expect(screen.getByText("Outline")).toBeInTheDocument();
      expect(screen.getByText("Destructive")).toBeInTheDocument();
    });
  });

  describe("form elements section", () => {
    it("should render form elements card", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Form Elements")).toBeInTheDocument();
      expect(screen.getByText(/input fields and form controls/i)).toBeInTheDocument();
    });

    it("should render input fields", () => {
      render(<ComponentsPage />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Disabled")).toBeInTheDocument();
    });

    it("should render checkboxes", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Checkboxes")).toBeInTheDocument();
      expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Option 2 (checked)")).toBeInTheDocument();
    });

    it("should render radio group", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Radio Group")).toBeInTheDocument();
      expect(screen.getByLabelText("Standard Enhancement")).toBeInTheDocument();
      expect(screen.getByLabelText("Pro Enhancement")).toBeInTheDocument();
      expect(screen.getByLabelText("Max Enhancement")).toBeInTheDocument();
    });

    it("should render select dropdown", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Select / Dropdown")).toBeInTheDocument();
    });

    it("should render toggle switch", () => {
      render(<ComponentsPage />);
      expect(screen.getByLabelText("Toggle switch")).toBeInTheDocument();
    });
  });

  describe("separators section", () => {
    it("should render separators card", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Separators")).toBeInTheDocument();
      expect(screen.getByText(/visual dividers for content sections/i)).toBeInTheDocument();
    });
  });
});
