import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import FeedbackPage from "./page";

describe("FeedbackPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Feedback Components")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<FeedbackPage />);
      expect(
        screen.getByText(
          /toast notifications and alert components for user feedback/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("toast notifications section", () => {
    it("should render toast notifications card", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Toast Notifications")).toBeInTheDocument();
      expect(
        screen.getByText(/click the buttons to see different toast variants/i),
      ).toBeInTheDocument();
    });

    it("should render toast trigger buttons", () => {
      render(<FeedbackPage />);
      expect(screen.getByRole("button", { name: /success toast/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /error toast/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /info toast/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /warning toast/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /default toast/i }))
        .toBeInTheDocument();
    });
  });

  describe("semantic colors section", () => {
    it("should render semantic state colors card", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Semantic State Colors")).toBeInTheDocument();
      expect(
        screen.getByText(
          /color utilities for success, warning, and error states/i,
        ),
      ).toBeInTheDocument();
    });

    it("should render success state", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Success State")).toBeInTheDocument();
    });

    it("should render warning state", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Warning State")).toBeInTheDocument();
    });

    it("should render error state", () => {
      render(<FeedbackPage />);
      expect(screen.getByText("Error State")).toBeInTheDocument();
    });
  });
});
