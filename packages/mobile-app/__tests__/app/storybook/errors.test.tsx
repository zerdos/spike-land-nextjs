/**
 * Tests for Errors Storybook Page
 * Ensures error handling components render correctly
 */

import { render } from "@testing-library/react-native";
import React from "react";

import ErrorsPage from "../../../app/storybook/errors";

describe("ErrorsPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Errors")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("Error handling components and error boundaries"),
      ).toBeTruthy();
    });
  });

  describe("404 Not Found section", () => {
    it("should render 404 section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("404 Not Found")).toBeTruthy();
    });

    it("should render 404 section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Page not found error state.")).toBeTruthy();
    });

    it("should render 404 code", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("404")).toBeTruthy();
    });

    it("should render Page Not Found title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Page Not Found")).toBeTruthy();
    });

    it("should render 404 error message", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("The page you're looking for doesn't exist or has been moved."),
      ).toBeTruthy();
    });

    it("should render Go Home button", () => {
      const { getAllByText } = render(<ErrorsPage />);
      const goHomeButtons = getAllByText("Go Home");
      expect(goHomeButtons.length).toBeGreaterThan(0);
    });
  });

  describe("500 Server Error section", () => {
    it("should render 500 section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("500 Server Error")).toBeTruthy();
    });

    it("should render 500 section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Internal server error state.")).toBeTruthy();
    });

    it("should render Server Error title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Server Error")).toBeTruthy();
    });

    it("should render server error message", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("Something went wrong on our end. Please try again later."),
      ).toBeTruthy();
    });

    it("should render Retry button", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Retry")).toBeTruthy();
    });
  });

  describe("Network Error section", () => {
    it("should render Network Error section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Network Error")).toBeTruthy();
    });

    it("should render Network Error section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Connection failed error state.")).toBeTruthy();
    });

    it("should render No Connection title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("No Connection")).toBeTruthy();
    });

    it("should render network error message", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("Please check your internet connection and try again."),
      ).toBeTruthy();
    });

    it("should render Retry Connection button", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Retry Connection")).toBeTruthy();
    });
  });

  describe("Form Validation Errors section", () => {
    it("should render Form Validation section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Form Validation Errors")).toBeTruthy();
    });

    it("should render Form Validation section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Inline field validation error states.")).toBeTruthy();
    });

    it("should render Email field", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Email")).toBeTruthy();
      expect(getByText("invalid-email")).toBeTruthy();
      expect(getByText("Please enter a valid email address")).toBeTruthy();
    });

    it("should render Password field", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Password")).toBeTruthy();
      expect(getByText("weak")).toBeTruthy();
      expect(getByText("Password must be at least 8 characters")).toBeTruthy();
    });

    it("should render Username field with success state", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Username")).toBeTruthy();
      expect(getByText("spike_user")).toBeTruthy();
      expect(getByText("Username is available")).toBeTruthy();
    });
  });

  describe("Error Boundary section", () => {
    it("should render Error Boundary section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Error Boundary")).toBeTruthy();
    });

    it("should render Error Boundary section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Fallback UI for runtime errors.")).toBeTruthy();
    });

    it("should render Something went wrong title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Something went wrong")).toBeTruthy();
    });

    it("should render error boundary message", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("An unexpected error occurred. Our team has been notified."),
      ).toBeTruthy();
    });

    it("should render Error Details label", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Error Details:")).toBeTruthy();
    });

    it("should render Copy Error button", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Copy Error")).toBeTruthy();
    });

    it("should render Reload App button", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Reload App")).toBeTruthy();
    });
  });

  describe("Empty States section", () => {
    it("should render Empty States section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Empty States")).toBeTruthy();
    });

    it("should render Empty States section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Helpful prompts when no data is available.")).toBeTruthy();
    });

    it("should render No Images Yet title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("No Images Yet")).toBeTruthy();
    });

    it("should render empty state message", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(
        getByText("Upload your first image to get started with AI enhancement."),
      ).toBeTruthy();
    });

    it("should render Upload Image button", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Upload Image")).toBeTruthy();
    });
  });

  describe("API Error Codes section", () => {
    it("should render API Error Codes section title", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("API Error Codes")).toBeTruthy();
    });

    it("should render API Error Codes section description", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("Common API errors and their meanings.")).toBeTruthy();
    });

    it("should render 400 Bad Request", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("400")).toBeTruthy();
      expect(getByText("Bad Request")).toBeTruthy();
      expect(getByText("Invalid request parameters")).toBeTruthy();
    });

    it("should render 401 Unauthorized", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("401")).toBeTruthy();
      expect(getByText("Unauthorized")).toBeTruthy();
      expect(getByText("Authentication required")).toBeTruthy();
    });

    it("should render 403 Forbidden", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("403")).toBeTruthy();
      expect(getByText("Forbidden")).toBeTruthy();
      expect(getByText("Insufficient permissions")).toBeTruthy();
    });

    it("should render 429 Rate Limited", () => {
      const { getByText } = render(<ErrorsPage />);
      expect(getByText("429")).toBeTruthy();
      expect(getByText("Rate Limited")).toBeTruthy();
      expect(getByText("Too many requests")).toBeTruthy();
    });
  });
});
