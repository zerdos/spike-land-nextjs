import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComponentsPage from "./page";

describe("ComponentsPage", () => {
  describe("rendering", () => {
    it("should render the main title", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("UI Components")).toBeInTheDocument();
    });

    it("should render usage guide", () => {
      render(<ComponentsPage />);
      expect(screen.getByText(/Use these components to build consistent/i)).toBeInTheDocument();
    });
  });

  describe("sections", () => {
    it("should render surface system section", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Surface System")).toBeInTheDocument();
    });

    it("should render inputs and controls", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Inputs & Controls")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. user@spike.land")).toBeInTheDocument();
      expect(screen.getByText("Enable GPU")).toBeInTheDocument();
    });

    it("should render selection elements", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Hobby (Free)")).toBeInTheDocument();
      expect(screen.getByText("Standard Enhancement")).toBeInTheDocument();
    });

    it("should render progress & status section", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Progress & Status")).toBeInTheDocument();
      expect(screen.getByText("Task Progress")).toBeInTheDocument();
      expect(screen.getByText("Optimization Complete")).toBeInTheDocument();
    });

    it("should render semantic messaging section", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Semantic Messaging")).toBeInTheDocument();
      expect(screen.getByText("System Update")).toBeInTheDocument();
      expect(screen.getByText("Deployment Success")).toBeInTheDocument();
      expect(screen.getByText("Critical Failure")).toBeInTheDocument();
    });

    it("should render navigation & layout section", () => {
      render(<ComponentsPage />);
      expect(screen.getByText("Navigation & Layout")).toBeInTheDocument();
    });
  });
});
