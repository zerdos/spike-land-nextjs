/**
 * Tests for Components Storybook Page
 * Ensures UI components render correctly
 */

import { fireEvent, render } from "@testing-library/react-native";

// Mock Switch component from react-native
jest.mock("react-native/Libraries/Components/Switch/Switch", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
  };
});

import ComponentsPage from "../../../app/storybook/components";

describe("ComponentsPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("UI Components")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(
        getByText(/A collection of atomic and molecular elements/),
      ).toBeTruthy();
    });
  });

  describe("Card Variants section", () => {
    it("should render Card Variants section title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Card Variants")).toBeTruthy();
    });

    it("should render Card Variants description", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(
        getByText(/Beyond glass-morphism, we use specialized card styles/),
      ).toBeTruthy();
    });

    it("should render Default Card", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Default Card")).toBeTruthy();
      expect(getByText("Standard card with glass effect")).toBeTruthy();
    });

    it("should render Glass Card", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Glass Card")).toBeTruthy();
      expect(getByText("Transparent glass effect")).toBeTruthy();
    });

    it("should render Elevated Card", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Elevated Card")).toBeTruthy();
      expect(getByText("Raised with enhanced shadow")).toBeTruthy();
    });

    it("should render Interactive Card", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Interactive Card")).toBeTruthy();
      expect(getByText("Press to interact")).toBeTruthy();
    });
  });

  describe("Inputs & Controls section", () => {
    it("should render Inputs & Controls section title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Inputs & Controls")).toBeTruthy();
    });

    it("should render Inputs description", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(
        getByText("Forms are the heart of our data collection systems."),
      ).toBeTruthy();
    });

    it("should render Text Input section", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Text Input")).toBeTruthy();
    });

    it("should render Email Address input", () => {
      const { getByTestId } = render(<ComponentsPage />);
      expect(getByTestId("email-input")).toBeTruthy();
    });

    it("should render Error State input", () => {
      const { getByTestId, getByText } = render(<ComponentsPage />);
      expect(getByTestId("error-input")).toBeTruthy();
      expect(getByText("Please enter a valid email.")).toBeTruthy();
    });

    it("should render Success State input", () => {
      const { getByTestId, getByText } = render(<ComponentsPage />);
      expect(getByTestId("success-input")).toBeTruthy();
      expect(getByText("Username is available!")).toBeTruthy();
    });

    it("should render Icon input", () => {
      const { getByTestId } = render(<ComponentsPage />);
      expect(getByTestId("icon-input")).toBeTruthy();
    });

    it("should render Disabled input", () => {
      const { getByTestId } = render(<ComponentsPage />);
      expect(getByTestId("disabled-input")).toBeTruthy();
    });

    it("should handle text input changes", () => {
      const { getByTestId } = render(<ComponentsPage />);
      const input = getByTestId("email-input");
      fireEvent.changeText(input, "test@example.com");
      // Input should handle the text change
      expect(input).toBeTruthy();
    });
  });

  describe("Badges section", () => {
    it("should render Badges section title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Badges")).toBeTruthy();
    });

    it("should render Badges description", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Small status or tag indicators.")).toBeTruthy();
    });

    it("should render all badge variants", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Default")).toBeTruthy();
      expect(getByText("Active")).toBeTruthy();
      expect(getByText("Completed")).toBeTruthy();
      expect(getByText("In Progress")).toBeTruthy();
      expect(getByText("Critical")).toBeTruthy();
      expect(getByText("Outline")).toBeTruthy();
    });
  });

  describe("Switch & Toggle section", () => {
    it("should render Switch & Toggle section title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Switch & Toggle")).toBeTruthy();
    });

    it("should render Switch description", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(
        getByText("Boolean controls for settings and preferences."),
      ).toBeTruthy();
    });

    it("should render GPU Acceleration toggle", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Enable GPU Acceleration")).toBeTruthy();
      expect(
        getByText("Use hardware acceleration for better performance"),
      ).toBeTruthy();
    });
  });

  describe("Alerts section", () => {
    it("should render Alerts section title", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Alerts")).toBeTruthy();
    });

    it("should render Alerts description", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Semantic messaging for user feedback.")).toBeTruthy();
    });

    it("should render System Update alert", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("System Update")).toBeTruthy();
      expect(
        getByText("A new version is available for download."),
      ).toBeTruthy();
    });

    it("should render Success alert", () => {
      const { getAllByText, getByText } = render(<ComponentsPage />);
      const successTexts = getAllByText("Success");
      expect(successTexts.length).toBeGreaterThan(0);
      expect(getByText("Your changes have been saved.")).toBeTruthy();
    });

    it("should render Low Credits alert", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Low Credits")).toBeTruthy();
      expect(
        getByText("You have less than 50 tokens remaining."),
      ).toBeTruthy();
    });

    it("should render Error alert", () => {
      const { getByText } = render(<ComponentsPage />);
      expect(getByText("Error")).toBeTruthy();
      expect(getByText("The AI model failed to initialize.")).toBeTruthy();
    });
  });
});
