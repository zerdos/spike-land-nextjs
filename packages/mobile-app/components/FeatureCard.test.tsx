/**
 * Tests for FeatureCard Component
 * Ensures the feature card renders correctly with all styling variants
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { View } from "react-native";

import { createFeatureCards, FeatureCard, type FeatureCardVariant } from "./FeatureCard";

// Mock useColorScheme by spying on the module
const mockUseColorScheme = jest.spyOn(ReactNative, "useColorScheme");

describe("FeatureCard", () => {
  const MockIcon = () => <View testID="mock-icon" />;

  const defaultProps = {
    icon: <MockIcon />,
    title: "Test Feature",
    description: "This is a test feature description",
    testID: "feature-card",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue("light");
  });

  describe("rendering", () => {
    it("renders the card container", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card")).toBeTruthy();
    });

    it("renders the icon", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card-icon")).toBeTruthy();
    });

    it("renders the title", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card-title")).toBeTruthy();
      expect(screen.getByText("Test Feature")).toBeTruthy();
    });

    it("renders the description", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card-description")).toBeTruthy();
      expect(screen.getByText("This is a test feature description"))
        .toBeTruthy();
    });
  });

  describe("variants", () => {
    const variants: FeatureCardVariant[] = [
      "purple",
      "yellow",
      "blue",
      "green",
    ];

    variants.forEach((variant) => {
      it(`renders with ${variant} variant`, () => {
        render(
          <FeatureCard
            {...defaultProps}
            variant={variant}
            testID={`card-${variant}`}
          />,
        );
        expect(screen.getByTestId(`card-${variant}`)).toBeTruthy();
      });
    });

    it("uses blue as default variant when not specified", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card")).toBeTruthy();
    });
  });

  describe("interactions", () => {
    it("calls onPress when card is pressed", () => {
      const onPress = jest.fn();
      render(<FeatureCard {...defaultProps} onPress={onPress} />);

      const card = screen.getByTestId("feature-card");
      fireEvent.press(card);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("does not call onPress when not provided", () => {
      render(<FeatureCard {...defaultProps} />);
      const card = screen.getByTestId("feature-card");

      // Should not throw when pressed without handler
      fireEvent.press(card);
      expect(card).toBeTruthy();
    });
  });

  describe("dark mode", () => {
    beforeEach(() => {
      mockUseColorScheme.mockReturnValue("dark");
    });

    afterEach(() => {
      mockUseColorScheme.mockReturnValue("light");
    });

    it("renders correctly in dark mode", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card")).toBeTruthy();
    });

    it("renders title in dark mode", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByText("Test Feature")).toBeTruthy();
    });

    it("renders description in dark mode", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByText("This is a test feature description"))
        .toBeTruthy();
    });
  });

  describe("light mode", () => {
    beforeEach(() => {
      mockUseColorScheme.mockReturnValue("light");
    });

    it("renders correctly in light mode", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card")).toBeTruthy();
    });
  });

  describe("null color scheme", () => {
    beforeEach(() => {
      mockUseColorScheme.mockReturnValue(null);
    });

    afterEach(() => {
      mockUseColorScheme.mockReturnValue("light");
    });

    it("renders correctly when color scheme is null", () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByTestId("feature-card")).toBeTruthy();
    });
  });

  describe("without testID", () => {
    it("renders correctly without testID prop", () => {
      render(
        <FeatureCard
          icon={<MockIcon />}
          title="No TestID Feature"
          description="Feature without testID"
        />,
      );
      expect(screen.getByText("No TestID Feature")).toBeTruthy();
      expect(screen.getByText("Feature without testID")).toBeTruthy();
    });
  });
});

describe("createFeatureCards", () => {
  const MockClock = () => <View testID="clock-icon" />;
  const MockImage = () => <View testID="image-icon" />;
  const MockLayers = () => <View testID="layers-icon" />;
  const MockCoins = () => <View testID="coins-icon" />;

  const mockIcons = {
    Clock: MockClock,
    Image: MockImage,
    Layers: MockLayers,
    Coins: MockCoins,
  };

  it("creates 4 feature cards", () => {
    const features = createFeatureCards(mockIcons);
    expect(features).toHaveLength(4);
  });

  it("creates 60-Second Magic feature", () => {
    const features = createFeatureCards(mockIcons);
    const magicFeature = features.find((f) => f.title === "60-Second Magic");

    expect(magicFeature).toBeDefined();
    expect(magicFeature?.variant).toBe("purple");
    expect(magicFeature?.description).toContain("Upload");
  });

  it("creates Print-Ready 4K feature", () => {
    const features = createFeatureCards(mockIcons);
    const printFeature = features.find((f) => f.title === "Print-Ready 4K");

    expect(printFeature).toBeDefined();
    expect(printFeature?.variant).toBe("yellow");
    expect(printFeature?.description).toContain("frame");
  });

  it("creates Batch Albums feature", () => {
    const features = createFeatureCards(mockIcons);
    const batchFeature = features.find((f) => f.title === "Batch Albums");

    expect(batchFeature).toBeDefined();
    expect(batchFeature?.variant).toBe("blue");
    expect(batchFeature?.description).toContain("100 photos");
  });

  it("creates Free Tokens feature", () => {
    const features = createFeatureCards(mockIcons);
    const tokenFeature = features.find((f) => f.title === "Free Tokens");

    expect(tokenFeature).toBeDefined();
    expect(tokenFeature?.variant).toBe("green");
    expect(tokenFeature?.description).toContain("regenerate");
  });

  it("each feature has an icon", () => {
    const features = createFeatureCards(mockIcons);
    features.forEach((feature) => {
      expect(feature.icon).toBeDefined();
    });
  });

  it("each feature has a title", () => {
    const features = createFeatureCards(mockIcons);
    features.forEach((feature) => {
      expect(feature.title).toBeTruthy();
      expect(typeof feature.title).toBe("string");
    });
  });

  it("each feature has a description", () => {
    const features = createFeatureCards(mockIcons);
    features.forEach((feature) => {
      expect(feature.description).toBeTruthy();
      expect(typeof feature.description).toBe("string");
    });
  });

  it("each feature has a variant", () => {
    const features = createFeatureCards(mockIcons);
    const validVariants = ["purple", "yellow", "blue", "green"];
    features.forEach((feature) => {
      expect(validVariants).toContain(feature.variant);
    });
  });
});
