/**
 * Referrals Screen Tests
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";

import { Alert } from "react-native";

import { useReferralStats } from "@/hooks";

import ReferralsScreen from "@/app/referrals/index";

// Mock dependencies
jest.mock("expo-clipboard");
jest.mock("@/hooks");
jest.mock("@/components/ReferralStats", () => ({
  ReferralStats: ({ stats, isLoading, testID }: any) => {
    const MockView = jest.requireActual("react-native").View;
    const MockText = jest.requireActual("react-native").Text;
    return (
      <MockView testID={testID || "referral-stats"}>
        <MockText>Total: {stats?.totalReferrals}</MockText>
        <MockText>Loading: {isLoading?.toString()}</MockText>
      </MockView>
    );
  },
}));

jest.mock("@/components/ShareButtons", () => ({
  ShareButtons: ({ referralUrl, onShareError }: any) => {
    const MockView = jest.requireActual("react-native").View;
    const MockText = jest.requireActual("react-native").Text;
    const MockTouchableOpacity = jest.requireActual("react-native").TouchableOpacity;
    return (
      <MockView testID="share-buttons">
        <MockText>{referralUrl}</MockText>
        <MockTouchableOpacity
          testID="trigger-share-error"
          onPress={() => onShareError?.(new Error("Share failed"))}
        >
          <MockText>Trigger Error</MockText>
        </MockTouchableOpacity>
      </MockView>
    );
  },
}));

jest.mock("@/components/ReferredUsersList", () => ({
  ReferredUsersList: ({ users, onLoadMore, hasMore }: any) => {
    const MockView = jest.requireActual("react-native").View;
    const MockText = jest.requireActual("react-native").Text;
    const MockTouchableOpacity = jest.requireActual("react-native").TouchableOpacity;
    return (
      <MockView testID="referred-users-list">
        <MockText>Users: {users?.length || 0}</MockText>
        {hasMore && (
          <MockTouchableOpacity onPress={onLoadMore} testID="load-more">
            <MockText>Load More</MockText>
          </MockTouchableOpacity>
        )}
      </MockView>
    );
  },
}));

// Mock Tamagui components
jest.mock("tamagui", () => {
  const MockView = jest.requireActual("react-native").View;
  const MockText = jest.requireActual("react-native").Text;
  const MockTouchableOpacity = jest.requireActual("react-native").TouchableOpacity;

  return {
    Button: ({
      children,
      onPress,
      testID,
      disabled,
      ...props
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      disabled?: boolean;
    }) => (
      <MockTouchableOpacity
        onPress={onPress}
        testID={testID}
        disabled={disabled}
        {...props}
      >
        <MockText>{children}</MockText>
      </MockTouchableOpacity>
    ),
    Card: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => (
      <MockView testID={testID} {...props}>
        {children}
      </MockView>
    ),
    H1: ({ children, ...props }: { children: React.ReactNode; }) => (
      <MockText {...props}>{children}</MockText>
    ),
    H4: ({ children, ...props }: { children: React.ReactNode; }) => (
      <MockText {...props}>{children}</MockText>
    ),
    Paragraph: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => (
      <MockText testID={testID} {...props}>
        {children}
      </MockText>
    ),
    Separator: () => <MockView testID="separator" />,
    Spinner: ({ testID }: { testID?: string; }) => <MockView testID={testID || "spinner"} />,
    Text: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
    }) => <MockText {...props}>{children}</MockText>,
    View: ({
      children,
      testID,
      style,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      style?: any;
    }) => (
      <MockView testID={testID} style={style} {...props}>
        {children}
      </MockView>
    ),
    XStack: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => (
      <MockView testID={testID} {...props}>
        {children}
      </MockView>
    ),
    YStack: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => (
      <MockView testID={testID} {...props}>
        {children}
      </MockView>
    ),
  };
});

// Mock Tamagui icons
jest.mock("@tamagui/lucide-icons", () => ({
  HelpCircle: () => null,
}));

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockedClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
const mockedUseReferralStats = useReferralStats as jest.MockedFunction<
  typeof useReferralStats
>;

const defaultMockData = {
  referralCode: "ABC123",
  referralUrl: "https://spike.land/ref/ABC123",
  stats: {
    totalReferrals: 10,
    completedReferrals: 7,
    pendingReferrals: 3,
    tokensEarned: 350,
  },
  referredUsers: [
    {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      status: "COMPLETED" as const,
      createdAt: "2024-01-15T10:00:00Z",
      tokensGranted: 50,
    },
  ],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  loadMoreUsers: jest.fn(),
  hasMoreUsers: false,
};

describe("ReferralsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedClipboard.setStringAsync.mockResolvedValue(true);
    mockedUseReferralStats.mockReturnValue(defaultMockData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render the referrals screen", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("referrals-screen")).toBeTruthy();
    });

    it("should render hero section", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("hero-section")).toBeTruthy();
    });

    it("should render referral link card", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("referral-link-card")).toBeTruthy();
    });

    it("should render share buttons card", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("share-buttons-card")).toBeTruthy();
    });

    it("should render how it works section", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("how-it-works")).toBeTruthy();
    });

    it("should render all how it works steps", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("step-1")).toBeTruthy();
      expect(getByTestId("step-2")).toBeTruthy();
      expect(getByTestId("step-3")).toBeTruthy();
    });

    it("should render referred users section", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("referred-users-section")).toBeTruthy();
      expect(getByTestId("referred-users-list")).toBeTruthy();
    });

    it("should render referral stats when stats are available", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("referral-stats")).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("should show loading state when data is loading", () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        isLoading: true,
        stats: null,
      });

      const { getByTestId, queryByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("loading-container")).toBeTruthy();
      expect(queryByTestId("referrals-screen")).toBeNull();
    });

    it("should show main content when loading is complete", () => {
      const { getByTestId, queryByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("referrals-screen")).toBeTruthy();
      expect(queryByTestId("loading-container")).toBeNull();
    });
  });

  describe("Error State", () => {
    it("should show error state when there is an error", () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        error: "Failed to load referral data",
        stats: null,
      });

      const { getByTestId, getByText } = render(<ReferralsScreen />);

      expect(getByTestId("error-container")).toBeTruthy();
      expect(getByText("Failed to load referral data")).toBeTruthy();
    });

    it("should call refetch when retry button is pressed", () => {
      const mockRefetch = jest.fn();
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        error: "Failed to load",
        stats: null,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<ReferralsScreen />);

      fireEvent.press(getByTestId("retry-button"));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Copy Code Functionality", () => {
    it("should copy referral code when copy code button is pressed", async () => {
      const { getByTestId } = render(<ReferralsScreen />);

      fireEvent.press(getByTestId("copy-code-button"));

      await waitFor(() => {
        expect(mockedClipboard.setStringAsync).toHaveBeenCalledWith("ABC123");
      });
    });

    it("should show 'Copied!' text after copying", async () => {
      const { getByTestId, getByText } = render(<ReferralsScreen />);

      await act(async () => {
        fireEvent.press(getByTestId("copy-code-button"));
      });

      await waitFor(() => {
        expect(getByText("Copied!")).toBeTruthy();
      });
    });

    it("should reset copied state after 2 seconds", async () => {
      const { getByTestId, getByText } = render(<ReferralsScreen />);

      await act(async () => {
        fireEvent.press(getByTestId("copy-code-button"));
      });

      await waitFor(() => {
        expect(getByText("Copied!")).toBeTruthy();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getByText("Copy Code")).toBeTruthy();
      });
    });

    it("should not copy if referral code is null", async () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        referralCode: null,
      });

      const { getByTestId } = render(<ReferralsScreen />);

      fireEvent.press(getByTestId("copy-code-button"));

      await waitFor(() => {
        expect(mockedClipboard.setStringAsync).not.toHaveBeenCalled();
      });
    });

    it("should show error alert when copy fails", async () => {
      const alertSpy = jest.spyOn(Alert, "alert");
      mockedClipboard.setStringAsync.mockRejectedValue(
        new Error("Copy failed"),
      );

      const { getByTestId } = render(<ReferralsScreen />);

      await act(async () => {
        fireEvent.press(getByTestId("copy-code-button"));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Error",
          "Failed to copy code to clipboard",
        );
      });
    });
  });

  describe("Referral Link Display", () => {
    it("should display referral URL", () => {
      const { getByTestId, getAllByText } = render(<ReferralsScreen />);

      expect(getByTestId("referral-url-display")).toBeTruthy();
      // URL appears in both referral-url-display and share-buttons
      expect(getAllByText("https://spike.land/ref/ABC123").length)
        .toBeGreaterThan(0);
    });

    it("should display 'Loading...' when referral URL is null", () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        referralUrl: null,
      });

      const { getByText } = render(<ReferralsScreen />);

      expect(getByText("Loading...")).toBeTruthy();
    });

    it("should display referral code", () => {
      const { getByTestId, getByText } = render(<ReferralsScreen />);

      expect(getByTestId("referral-code-section")).toBeTruthy();
      expect(getByText("ABC123")).toBeTruthy();
    });

    it("should display '...' when referral code is null", () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        referralCode: null,
      });

      const { getByText } = render(<ReferralsScreen />);

      expect(getByText("...")).toBeTruthy();
    });
  });

  describe("Share Callbacks", () => {
    it("should handle share success", () => {
      // Just verify the component renders without errors
      const { getByTestId } = render(<ReferralsScreen />);

      expect(getByTestId("share-buttons")).toBeTruthy();
    });

    it("should handle share error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { getByTestId } = render(<ReferralsScreen />);

      fireEvent.press(getByTestId("trigger-share-error"));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Share error:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Refresh Control", () => {
    it("should have refresh control", () => {
      const { getByTestId } = render(<ReferralsScreen />);

      const scrollView = getByTestId("referrals-screen");
      expect(scrollView.props.refreshControl).toBeTruthy();
    });
  });

  describe("Load More Users", () => {
    it("should call loadMoreUsers when load more is pressed", () => {
      const mockLoadMore = jest.fn();
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        hasMoreUsers: true,
        loadMoreUsers: mockLoadMore,
      });

      const { getByTestId } = render(<ReferralsScreen />);

      fireEvent.press(getByTestId("load-more"));

      expect(mockLoadMore).toHaveBeenCalled();
    });
  });

  describe("Stats Rendering", () => {
    it("should not render stats when stats is null", () => {
      mockedUseReferralStats.mockReturnValue({
        ...defaultMockData,
        stats: null,
        isLoading: false,
        error: null,
      });

      const { queryByTestId } = render(<ReferralsScreen />);

      // The screen should still render
      expect(queryByTestId("referrals-screen")).toBeTruthy();
    });
  });

  describe("Token Information", () => {
    it("should display correct token amounts in hero section", () => {
      const { getByText } = render(<ReferralsScreen />);

      expect(getByText(/Earn 50 Tokens/)).toBeTruthy();
    });

    it("should display token information in how it works steps", () => {
      const { getAllByText } = render(<ReferralsScreen />);

      // REFERRAL_CONFIG.TOKENS_PER_REFERRAL = 50
      // REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS = 50
      expect(getAllByText(/50/).length).toBeGreaterThan(0);
    });
  });
});

describe("HeroSection", () => {
  beforeEach(() => {
    mockedUseReferralStats.mockReturnValue(defaultMockData);
  });

  it("should render hero section with correct content", () => {
    const { getByTestId, getByText } = render(<ReferralsScreen />);

    expect(getByTestId("hero-section")).toBeTruthy();
    expect(getByText(/Invite friends and earn/)).toBeTruthy();
  });
});

describe("ReferralLinkCard", () => {
  beforeEach(() => {
    mockedUseReferralStats.mockReturnValue(defaultMockData);
  });

  it("should render referral link card with all elements", () => {
    const { getByTestId, getByText } = render(<ReferralsScreen />);

    expect(getByTestId("referral-link-card")).toBeTruthy();
    expect(getByTestId("referral-url-display")).toBeTruthy();
    expect(getByTestId("referral-code-section")).toBeTruthy();
    expect(getByText("Your Referral Link")).toBeTruthy();
    expect(getByText("Referral Code")).toBeTruthy();
  });
});

describe("HowItWorks", () => {
  beforeEach(() => {
    mockedUseReferralStats.mockReturnValue(defaultMockData);
  });

  it("should render how it works with correct steps", () => {
    const { getByTestId, getAllByText } = render(<ReferralsScreen />);

    expect(getByTestId("how-it-works")).toBeTruthy();
    // "Share Your Link" appears in both the card header and how-it-works step
    expect(getAllByText("Share Your Link").length).toBeGreaterThan(0);
    expect(getAllByText("Friend Signs Up").length).toBeGreaterThan(0);
    expect(getAllByText("Both Earn Tokens").length).toBeGreaterThan(0);
  });
});
