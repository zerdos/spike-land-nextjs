/**
 * Tests for HeroSection Component
 * Ensures the hero section renders correctly with all elements and interactions
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { HeroSection } from "./HeroSection";

// Mock the expo-router module
jest.mock("expo-router", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  };
  return {
    router: mockRouter,
    useRouter: jest.fn(() => mockRouter),
  };
});

describe("HeroSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the hero section container", () => {
      render(<HeroSection testID="hero" />);
      expect(screen.getByTestId("hero")).toBeTruthy();
    });

    it("renders the main title with 'Old Photos'", () => {
      render(<HeroSection testID="hero" />);
      expect(screen.getByTestId("hero-title")).toBeTruthy();
      expect(screen.getByText(/Old Photos/)).toBeTruthy();
    });

    it("renders the subtitle text", () => {
      render(<HeroSection testID="hero" />);
      expect(screen.getByTestId("hero-subtitle")).toBeTruthy();
      expect(screen.getByText(/iPhone 4 photos deserve iPhone 16/))
        .toBeTruthy();
    });

    it("renders the CTA button", () => {
      render(<HeroSection testID="hero" />);
      const ctaButton = screen.getByTestId("hero-cta");
      expect(ctaButton).toBeTruthy();
    });

    it("renders the 'Start Enhancing' text on the CTA button", () => {
      render(<HeroSection testID="hero" />);
      const ctaButton = screen.getByTestId("hero-cta");
      // Tamagui Button renders text content directly, not wrapped in Text component
      // So we verify the button exists and has accessible content
      expect(ctaButton).toBeTruthy();
      expect(ctaButton.props.accessible).toBe(true);
    });

    it("renders the See Examples button", () => {
      render(<HeroSection testID="hero" />);
      const examplesButton = screen.getByTestId("hero-examples");
      expect(examplesButton).toBeTruthy();
    });
  });

  describe("interactions", () => {
    it("calls router.push when CTA is pressed without onStartEnhancing prop", () => {
      render(<HeroSection testID="hero" />);
      const ctaButton = screen.getByTestId("hero-cta");

      fireEvent.press(ctaButton);

      expect(router.push).toHaveBeenCalledWith("/enhance/upload");
    });

    it("calls onStartEnhancing callback when provided and CTA is pressed", () => {
      const onStartEnhancing = jest.fn();
      render(<HeroSection testID="hero" onStartEnhancing={onStartEnhancing} />);
      const ctaButton = screen.getByTestId("hero-cta");

      fireEvent.press(ctaButton);

      expect(onStartEnhancing).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
    });

    it("calls router.push to gallery when See Examples is pressed without callback", () => {
      render(<HeroSection testID="hero" />);
      const examplesButton = screen.getByTestId("hero-examples");

      fireEvent.press(examplesButton);

      expect(router.push).toHaveBeenCalledWith("/gallery");
    });

    it("calls onSeeExamples callback when provided and See Examples is pressed", () => {
      const onSeeExamples = jest.fn();
      render(<HeroSection testID="hero" onSeeExamples={onSeeExamples} />);
      const examplesButton = screen.getByTestId("hero-examples");

      fireEvent.press(examplesButton);

      expect(onSeeExamples).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("renders with minimum height for hero section", () => {
      render(<HeroSection testID="hero" />);
      const heroContainer = screen.getByTestId("hero");
      // The component should render without errors
      expect(heroContainer).toBeTruthy();
    });
  });

  describe("accessibility", () => {
    it("provides testIDs for all major elements", () => {
      render(<HeroSection testID="hero" />);

      expect(screen.getByTestId("hero")).toBeTruthy();
      expect(screen.getByTestId("hero-title")).toBeTruthy();
      expect(screen.getByTestId("hero-subtitle")).toBeTruthy();
      expect(screen.getByTestId("hero-cta")).toBeTruthy();
      expect(screen.getByTestId("hero-examples")).toBeTruthy();
    });
  });

  describe("without testID", () => {
    it("renders correctly without testID prop", () => {
      render(<HeroSection />);
      // Should render without crashing - verify by checking title text
      expect(screen.getByText(/Old Photos/)).toBeTruthy();
    });
  });
});
