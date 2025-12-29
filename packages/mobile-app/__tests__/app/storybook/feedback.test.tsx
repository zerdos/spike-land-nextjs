/**
 * Tests for Feedback Storybook Page
 * Ensures toast notifications, alerts, and semantic colors render correctly
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import FeedbackPage from "../../../app/storybook/feedback";

describe("FeedbackPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Feedback")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(
        getByText("Toast notifications, alerts, semantic state colors"),
      ).toBeTruthy();
    });
  });

  describe("Toast Notifications section", () => {
    it("should render Toast Notifications section title", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Toast Notifications")).toBeTruthy();
    });

    it("should render Toast Notifications description", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(
        getByText("Temporary messages that appear and auto-dismiss."),
      ).toBeTruthy();
    });

    it("should render Success trigger button", () => {
      const { getAllByText } = render(<FeedbackPage />);
      const successButtons = getAllByText("Success");
      expect(successButtons.length).toBeGreaterThan(0);
    });

    it("should render Error trigger button", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Error")).toBeTruthy();
    });

    it("should render Warning trigger button", () => {
      const { getAllByText } = render(<FeedbackPage />);
      const warningButtons = getAllByText("Warning");
      expect(warningButtons.length).toBeGreaterThan(0);
    });

    it("should render Info trigger button", () => {
      const { getAllByText } = render(<FeedbackPage />);
      const infoButtons = getAllByText("Info");
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    it("should show toast when Success button is pressed", async () => {
      jest.useFakeTimers();
      const { getAllByText, queryByText } = render(<FeedbackPage />);
      const successButtons = getAllByText("Success");
      fireEvent.press(successButtons[0]);
      await waitFor(() => {
        expect(queryByText("Success!")).toBeTruthy();
        expect(queryByText("Your changes have been saved.")).toBeTruthy();
      });
      jest.useRealTimers();
    });
  });

  describe("Alert States section", () => {
    it("should render Alert States section title", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Alert States")).toBeTruthy();
    });

    it("should render Alert States description", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(
        getByText("Persistent alerts for important information."),
      ).toBeTruthy();
    });

    it("should render Deployment Successful alert", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Deployment Successful")).toBeTruthy();
      expect(
        getByText("Your app has been deployed to production."),
      ).toBeTruthy();
    });

    it("should render Critical Error alert", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Critical Error")).toBeTruthy();
      expect(
        getByText(/The database connection failed/),
      ).toBeTruthy();
    });

    it("should render Low Storage alert", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Low Storage")).toBeTruthy();
      expect(
        getByText(/You're running low on storage space/),
      ).toBeTruthy();
    });

    it("should render System Update alert", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("System Update")).toBeTruthy();
      expect(
        getByText("A new version of the platform is available."),
      ).toBeTruthy();
    });
  });

  describe("Semantic Colors section", () => {
    it("should render Semantic Colors section title", () => {
      const { getAllByText } = render(<FeedbackPage />);
      const semanticColorsTitles = getAllByText("Semantic Colors");
      expect(semanticColorsTitles.length).toBeGreaterThan(0);
    });

    it("should render Semantic Colors description", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(
        getByText("Colors that convey meaning and system states."),
      ).toBeTruthy();
    });

    it("should render Success semantic color", () => {
      const { getAllByText, getByText } = render(<FeedbackPage />);
      const successTexts = getAllByText("Success");
      expect(successTexts.length).toBeGreaterThan(0);
      expect(getByText("Positive outcomes")).toBeTruthy();
    });

    it("should render Destructive semantic color", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Destructive")).toBeTruthy();
      expect(getByText("Errors & danger")).toBeTruthy();
    });

    it("should render Warning semantic color", () => {
      const { getAllByText, getByText } = render(<FeedbackPage />);
      const warningTexts = getAllByText("Warning");
      expect(warningTexts.length).toBeGreaterThan(0);
      expect(getByText("Caution needed")).toBeTruthy();
    });

    it("should render Info semantic color", () => {
      const { getAllByText, getByText } = render(<FeedbackPage />);
      const infoTexts = getAllByText("Info");
      expect(infoTexts.length).toBeGreaterThan(0);
      expect(getByText("Information")).toBeTruthy();
    });
  });

  describe("Progress Indicators section", () => {
    it("should render Progress Indicators section title", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Progress Indicators")).toBeTruthy();
    });

    it("should render Progress Indicators description", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(
        getByText("Visual feedback for ongoing operations."),
      ).toBeTruthy();
    });

    it("should render Processing progress", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Processing")).toBeTruthy();
      expect(getByText("65%")).toBeTruthy();
    });

    it("should render Upload Complete progress", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Upload Complete")).toBeTruthy();
    });

    it("should render Storage Used progress", () => {
      const { getByText } = render(<FeedbackPage />);
      expect(getByText("Storage Used")).toBeTruthy();
      expect(getByText("95%")).toBeTruthy();
    });
  });
});
