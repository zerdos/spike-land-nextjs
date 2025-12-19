import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoadingPage from "./page";

describe("LoadingPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Loading States")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<LoadingPage />);
      expect(
        screen.getByText(/skeleton loaders, progress bars, and spinners/i),
      ).toBeInTheDocument();
    });
  });

  describe("skeleton loaders section", () => {
    it("should render skeleton loaders card", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Skeleton Loaders")).toBeInTheDocument();
      expect(screen.getByText(/placeholder components for loading states/i))
        .toBeInTheDocument();
    });

    it("should render default skeleton label", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Default Skeleton")).toBeInTheDocument();
    });

    it("should render shimmer variant label", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Shimmer Variant")).toBeInTheDocument();
    });

    it("should render card skeleton label", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Card Skeleton")).toBeInTheDocument();
    });
  });

  describe("progress bars section", () => {
    it("should render progress bars card", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Progress Bars")).toBeInTheDocument();
      expect(screen.getByText(/progress indicators with optional glow effect/i))
        .toBeInTheDocument();
    });

    it("should render progress indicators with labels", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Default Progress (33%)")).toBeInTheDocument();
      expect(screen.getByText("Progress with Glow (66%)")).toBeInTheDocument();
      expect(screen.getByText("Complete (100%)")).toBeInTheDocument();
    });

    it("should render progress percentages", () => {
      render(<LoadingPage />);
      expect(screen.getByText("33%")).toBeInTheDocument();
      expect(screen.getByText("66%")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("spinners section", () => {
    it("should render spinners card", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Spinners & Animations")).toBeInTheDocument();
      expect(screen.getByText(/loading indicators and pulse animations/i))
        .toBeInTheDocument();
    });

    it("should render spinner labels", () => {
      render(<LoadingPage />);
      expect(screen.getByText("Spinner")).toBeInTheDocument();
      expect(screen.getByText("Pulse Cyan")).toBeInTheDocument();
      expect(screen.getByText("Pulse")).toBeInTheDocument();
    });
  });
});
