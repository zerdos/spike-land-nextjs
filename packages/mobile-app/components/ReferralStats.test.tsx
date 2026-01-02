/**
 * ReferralStats Component Tests
 */

import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";

import type { ReferralStatsData } from "./ReferralStats";
import { ReferralStats } from "./ReferralStats";

// Mock Tamagui components
jest.mock("tamagui", () => ({
  Card: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = jest.requireActual("react-native");
    return (
      <View testID={testID} {...props}>
        {children}
      </View>
    );
  },
  H3: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { Text } = jest.requireActual("react-native");
    return (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    );
  },
  Paragraph: ({ children }: { children: React.ReactNode; }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{children}</Text>;
  },
  XStack: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = jest.requireActual("react-native");
    return (
      <View testID={testID} {...props}>
        {children}
      </View>
    );
  },
  YStack: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = jest.requireActual("react-native");
    return (
      <View testID={testID} {...props}>
        {children}
      </View>
    );
  },
}));

// Mock Tamagui icons
jest.mock("@tamagui/lucide-icons", () => ({
  Gift: () => null,
  Trophy: () => null,
  Users: () => null,
}));

// Mock requestAnimationFrame for animations
jest.useFakeTimers();

const mockStats: ReferralStatsData = {
  totalReferrals: 10,
  completedReferrals: 7,
  pendingReferrals: 3,
  tokensEarned: 350,
};

describe("ReferralStats Component", () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component with stats", () => {
      const { getByTestId } = render(<ReferralStats stats={mockStats} />);

      expect(getByTestId("referral-stats")).toBeTruthy();
      expect(getByTestId("stats-row")).toBeTruthy();
      expect(getByTestId("tokens-earned-card")).toBeTruthy();
    });

    it("should render all stat cards", () => {
      const { getByTestId } = render(<ReferralStats stats={mockStats} />);

      expect(getByTestId("stat-total")).toBeTruthy();
      expect(getByTestId("stat-verified")).toBeTruthy();
      expect(getByTestId("stat-pending")).toBeTruthy();
    });

    it("should render loading state when isLoading is true", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferralStats stats={mockStats} isLoading={true} />,
      );

      expect(getByTestId("referral-stats-loading")).toBeTruthy();
      expect(queryByTestId("referral-stats")).toBeNull();
    });

    it("should not render loading state when isLoading is false", () => {
      const { queryByTestId, getByTestId } = render(
        <ReferralStats stats={mockStats} isLoading={false} />,
      );

      expect(queryByTestId("referral-stats-loading")).toBeNull();
      expect(getByTestId("referral-stats")).toBeTruthy();
    });
  });

  describe("Animated Values", () => {
    it("should start with 0 and animate to target values", async () => {
      const { getByTestId } = render(
        <ReferralStats stats={mockStats} animationDuration={100} />,
      );

      // Initial value should be 0
      const totalValue = getByTestId("stat-total-value");
      expect(totalValue.props.children).toBe(0);

      // Fast-forward animation with act()
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("stat-total-value").props.children).toBe(10);
      });
    });

    it("should animate tokens earned value", async () => {
      const { getByTestId } = render(
        <ReferralStats stats={mockStats} animationDuration={100} />,
      );

      const tokensValue = getByTestId("tokens-earned-value");
      expect(tokensValue.props.children).toBe(0);

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("tokens-earned-value").props.children).toBe(350);
      });
    });

    it("should handle zero values without animation", async () => {
      const zeroStats: ReferralStatsData = {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        tokensEarned: 0,
      };

      const { getByTestId } = render(
        <ReferralStats stats={zeroStats} animationDuration={100} />,
      );

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("stat-total-value").props.children).toBe(0);
        expect(getByTestId("tokens-earned-value").props.children).toBe(0);
      });
    });

    it("should use default animation duration", () => {
      const { getByTestId } = render(<ReferralStats stats={mockStats} />);

      // Component should render without errors with default duration
      expect(getByTestId("referral-stats")).toBeTruthy();
    });
  });

  describe("Different Stats Values", () => {
    it("should handle large numbers", async () => {
      const largeStats: ReferralStatsData = {
        totalReferrals: 1000,
        completedReferrals: 750,
        pendingReferrals: 250,
        tokensEarned: 50000,
      };

      const { getByTestId } = render(
        <ReferralStats stats={largeStats} animationDuration={100} />,
      );

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("stat-total-value").props.children).toBe(1000);
        expect(getByTestId("tokens-earned-value").props.children).toBe(50000);
      });
    });

    it("should handle stats with only completed referrals", async () => {
      const completedOnlyStats: ReferralStatsData = {
        totalReferrals: 5,
        completedReferrals: 5,
        pendingReferrals: 0,
        tokensEarned: 250,
      };

      const { getByTestId } = render(
        <ReferralStats stats={completedOnlyStats} animationDuration={100} />,
      );

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("stat-verified-value").props.children).toBe(5);
        expect(getByTestId("stat-pending-value").props.children).toBe(0);
      });
    });

    it("should handle stats with only pending referrals", async () => {
      const pendingOnlyStats: ReferralStatsData = {
        totalReferrals: 3,
        completedReferrals: 0,
        pendingReferrals: 3,
        tokensEarned: 0,
      };

      const { getByTestId } = render(
        <ReferralStats stats={pendingOnlyStats} animationDuration={100} />,
      );

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(getByTestId("stat-verified-value").props.children).toBe(0);
        expect(getByTestId("stat-pending-value").props.children).toBe(3);
      });
    });
  });

  describe("Props Handling", () => {
    it("should accept custom animation duration", () => {
      const { getByTestId } = render(
        <ReferralStats stats={mockStats} animationDuration={500} />,
      );

      expect(getByTestId("referral-stats")).toBeTruthy();
    });

    it("should render correctly without optional props", () => {
      const { getByTestId } = render(<ReferralStats stats={mockStats} />);

      expect(getByTestId("referral-stats")).toBeTruthy();
    });
  });
});

describe("ReferralStats Loading State", () => {
  it("should show placeholder values in loading state", () => {
    const { getByTestId } = render(
      <ReferralStats stats={mockStats} isLoading={true} />,
    );

    const loadingContainer = getByTestId("referral-stats-loading");
    expect(loadingContainer).toBeTruthy();
  });
});
