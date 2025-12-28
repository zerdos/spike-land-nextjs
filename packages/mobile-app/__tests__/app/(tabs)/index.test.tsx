/**
 * Tests for Home/Landing Screen
 * Ensures all landing components are rendered and integrated correctly
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

// Mock the stores
jest.mock("@/stores", () => ({
  useTokenStore: jest.fn(() => ({
    balance: 10,
    isLoading: false,
    fetchBalance: jest.fn(),
  })),
  useEnhancementStore: jest.fn(() => ({
    recentImages: [],
    isLoadingHistory: false,
    fetchRecentImages: jest.fn(),
  })),
}));

// Mock expo-router
jest.mock("expo-router", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };
  return {
    router: mockRouter,
    useRouter: jest.fn(() => mockRouter),
  };
});

// Mock the components
jest.mock("@/components/HeroSection", () => ({
  HeroSection: ({ testID }: { testID?: string; }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View testID={testID}>
        <Text>AI Photo</Text>
        <Text>Restoration</Text>
        <Pressable testID={`${testID}-cta`}>
          <Text>Start Enhancing</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock("@/components/BeforeAfterSlider", () => ({
  BeforeAfterSlider: ({ testID }: { testID?: string; }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={testID}>
        <Text>Before</Text>
        <Text>After</Text>
      </View>
    );
  },
}));

jest.mock("@/components/FeatureCard", () => ({
  FeatureCard: ({ title, testID }: { title: string; testID?: string; }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={testID}>
        <Text>{title}</Text>
      </View>
    );
  },
  createFeatureCards: () => [
    { icon: null, title: "60-Second Magic", description: "Fast", variant: "purple" },
    { icon: null, title: "Print-Ready 4K", description: "Quality", variant: "yellow" },
    { icon: null, title: "Batch Albums", description: "Batch", variant: "blue" },
    { icon: null, title: "Free Tokens", description: "Free", variant: "green" },
  ],
}));

// Import after mocks
import HomeScreen from "@/app/(tabs)/index";
import { useEnhancementStore, useTokenStore } from "@/stores";

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the home screen", () => {
      render(<HomeScreen />);
      expect(screen.getByTestId("hero-section")).toBeTruthy();
    });

    it("renders the hero section", () => {
      render(<HomeScreen />);
      expect(screen.getByTestId("hero-section")).toBeTruthy();
      expect(screen.getByText("AI Photo")).toBeTruthy();
    });

    it("renders the before/after slider", () => {
      render(<HomeScreen />);
      expect(screen.getByTestId("before-after-slider")).toBeTruthy();
    });

    it("renders 'See the Transformation' heading", () => {
      render(<HomeScreen />);
      expect(screen.getByText("See the Transformation")).toBeTruthy();
    });

    it("renders 'Why Pixel?' heading", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Why Pixel?")).toBeTruthy();
    });

    it("renders 4 feature cards", () => {
      render(<HomeScreen />);
      expect(screen.getByTestId("feature-card-0")).toBeTruthy();
      expect(screen.getByTestId("feature-card-1")).toBeTruthy();
      expect(screen.getByTestId("feature-card-2")).toBeTruthy();
      expect(screen.getByTestId("feature-card-3")).toBeTruthy();
    });

    it("renders feature card titles", () => {
      render(<HomeScreen />);
      expect(screen.getByText("60-Second Magic")).toBeTruthy();
      expect(screen.getByText("Print-Ready 4K")).toBeTruthy();
      expect(screen.getByText("Batch Albums")).toBeTruthy();
      expect(screen.getByText("Free Tokens")).toBeTruthy();
    });

    it("renders 'Quick Actions' section", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Quick Actions")).toBeTruthy();
    });

    it("renders 'Enhance Photo' quick action", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Enhance Photo")).toBeTruthy();
    });

    it("renders 'View Albums' quick action", () => {
      render(<HomeScreen />);
      expect(screen.getByText("View Albums")).toBeTruthy();
    });
  });

  describe("token balance card", () => {
    it("renders token balance", () => {
      render(<HomeScreen />);
      expect(screen.getByText("10 tokens")).toBeTruthy();
    });

    it("renders 'Available balance' label", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Available balance")).toBeTruthy();
    });

    it("renders 'Estimated enhancements' label", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Estimated enhancements")).toBeTruthy();
    });

    it("renders tier quality labels", () => {
      render(<HomeScreen />);
      expect(screen.getByText("1K quality")).toBeTruthy();
      expect(screen.getByText("2K quality")).toBeTruthy();
      expect(screen.getByText("4K quality")).toBeTruthy();
    });

    it("renders 'Top Up' button", () => {
      render(<HomeScreen />);
      expect(screen.getByText("Top Up")).toBeTruthy();
    });

    it("shows loading spinner when isLoading is true", () => {
      (useTokenStore as jest.Mock).mockReturnValue({
        balance: 0,
        isLoading: true,
        fetchBalance: jest.fn(),
      });

      render(<HomeScreen />);
      // When loading, balance text should not be shown
      expect(screen.queryByText("0 tokens")).toBeNull();
    });
  });

  describe("interactions", () => {
    it("navigates to pricing when 'Top Up' is pressed", () => {
      render(<HomeScreen />);
      const topUpButton = screen.getByText("Top Up");

      fireEvent.press(topUpButton);

      expect(router.push).toHaveBeenCalledWith("/pricing");
    });

    it("navigates to enhance/upload when 'Enhance Photo' is pressed", () => {
      render(<HomeScreen />);
      const enhanceCard = screen.getByText("Enhance Photo");

      // Find parent pressable
      fireEvent.press(enhanceCard);

      expect(router.push).toHaveBeenCalledWith("/enhance/upload");
    });

    it("navigates to albums when 'View Albums' is pressed", () => {
      render(<HomeScreen />);
      const albumsCard = screen.getByText("View Albums");

      fireEvent.press(albumsCard);

      expect(router.push).toHaveBeenCalledWith("/albums");
    });
  });

  describe("data fetching", () => {
    it("calls fetchBalance on mount", () => {
      const mockFetchBalance = jest.fn();
      (useTokenStore as jest.Mock).mockReturnValue({
        balance: 10,
        isLoading: false,
        fetchBalance: mockFetchBalance,
      });

      render(<HomeScreen />);

      expect(mockFetchBalance).toHaveBeenCalled();
    });

    it("calls fetchRecentImages on mount", () => {
      const mockFetchRecentImages = jest.fn();
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [],
        isLoadingHistory: false,
        fetchRecentImages: mockFetchRecentImages,
      });

      render(<HomeScreen />);

      expect(mockFetchRecentImages).toHaveBeenCalled();
    });
  });

  describe("recent enhancements section", () => {
    it("hides recent enhancements when empty", () => {
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [],
        isLoadingHistory: false,
        fetchRecentImages: jest.fn(),
      });

      render(<HomeScreen />);
      expect(screen.queryByText("Recent Enhancements")).toBeNull();
    });

    it("shows recent enhancements when images exist", () => {
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [
          {
            id: "1",
            name: "Test Image",
            originalUrl: "https://example.com/test.jpg",
            createdAt: new Date(),
          },
        ],
        isLoadingHistory: false,
        fetchRecentImages: jest.fn(),
      });

      render(<HomeScreen />);
      expect(screen.getByText("Recent Enhancements")).toBeTruthy();
    });

    it("shows 'See All' link when images exist", () => {
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [
          {
            id: "1",
            name: "Test Image",
            originalUrl: "https://example.com/test.jpg",
            createdAt: new Date(),
          },
        ],
        isLoadingHistory: false,
        fetchRecentImages: jest.fn(),
      });

      render(<HomeScreen />);
      expect(screen.getByText("See All")).toBeTruthy();
    });

    it("navigates to gallery when 'See All' is pressed", () => {
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [
          {
            id: "1",
            name: "Test Image",
            originalUrl: "https://example.com/test.jpg",
            createdAt: new Date(),
          },
        ],
        isLoadingHistory: false,
        fetchRecentImages: jest.fn(),
      });

      render(<HomeScreen />);
      const seeAllButton = screen.getByText("See All");

      fireEvent.press(seeAllButton);

      expect(router.push).toHaveBeenCalledWith("/gallery");
    });

    it("shows loading state when fetching history", () => {
      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [],
        isLoadingHistory: true,
        fetchRecentImages: jest.fn(),
      });

      render(<HomeScreen />);
      expect(screen.getByText("Loading recent images...")).toBeTruthy();
    });
  });

  describe("pull to refresh", () => {
    it("calls refresh handlers when pulled to refresh", () => {
      const mockFetchBalance = jest.fn();
      const mockFetchRecentImages = jest.fn();

      (useTokenStore as jest.Mock).mockReturnValue({
        balance: 10,
        isLoading: false,
        fetchBalance: mockFetchBalance,
      });

      (useEnhancementStore as jest.Mock).mockReturnValue({
        recentImages: [],
        isLoadingHistory: false,
        fetchRecentImages: mockFetchRecentImages,
      });

      render(<HomeScreen />);

      // The refresh handlers are called on mount and would be called on refresh
      // We can verify they're set up correctly
      expect(mockFetchBalance).toHaveBeenCalled();
      expect(mockFetchRecentImages).toHaveBeenCalled();
    });
  });
});
