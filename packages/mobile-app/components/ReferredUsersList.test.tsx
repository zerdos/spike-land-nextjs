/**
 * ReferredUsersList Component Tests
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { ReferredUser, ReferredUsersList } from "./ReferredUsersList";

// Mock Tamagui components
jest.mock("tamagui", () => ({
  Button: ({
    children,
    onPress,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={testID} {...props}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
  Card: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = require("react-native");
    return (
      <View testID={testID} {...props}>
        {children}
      </View>
    );
  },
  Paragraph: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { Text } = require("react-native");
    return (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    );
  },
  Text: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => {
    const { Text: RNText } = require("react-native");
    return <RNText {...props}>{children}</RNText>;
  },
  View: ({
    children,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => {
    const { View: RNView } = require("react-native");
    return (
      <RNView testID={testID} {...props}>
        {children}
      </RNView>
    );
  },
  XStack: ({
    children,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = require("react-native");
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
    const { View } = require("react-native");
    return (
      <View testID={testID} {...props}>
        {children}
      </View>
    );
  },
}));

// Mock Tamagui icons
jest.mock("@tamagui/lucide-icons", () => ({
  CheckCircle: () => null,
  Clock: () => null,
  UserPlus: () => null,
  Users: () => null,
}));

const mockUsers: ReferredUser[] = [
  {
    id: "user-1",
    email: "john.doe@example.com",
    name: "John Doe",
    status: "COMPLETED",
    createdAt: "2024-01-15T10:00:00Z",
    tokensGranted: 50,
  },
  {
    id: "user-2",
    email: "jane.smith@example.com",
    name: "Jane Smith",
    status: "PENDING",
    createdAt: "2024-01-20T14:30:00Z",
    tokensGranted: 0,
  },
  {
    id: "user-3",
    email: "ab@cd.com",
    name: null,
    status: "COMPLETED",
    createdAt: "2024-02-01T09:15:00Z",
    tokensGranted: 50,
  },
];

describe("ReferredUsersList Component", () => {
  describe("Rendering", () => {
    it("should render the list with users", () => {
      const { getByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      expect(getByTestId("referred-users-list")).toBeTruthy();
      expect(getByTestId("referred-user-user-1")).toBeTruthy();
      expect(getByTestId("referred-user-user-2")).toBeTruthy();
      expect(getByTestId("referred-user-user-3")).toBeTruthy();
    });

    it("should render user emails masked", () => {
      const { getByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      // Check that emails are masked (not showing full email)
      const emailElement = getByTestId("user-email-user-1");
      expect(emailElement.props.children).toContain("***");
    });

    it("should render user names masked when available", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      // User with name
      const nameElement = getByTestId("user-name-user-1");
      expect(nameElement.props.children).toContain("***");

      // User without name should not have name element
      expect(queryByTestId("user-name-user-3")).toBeNull();
    });

    it("should render status badges", () => {
      const { getByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      expect(getByTestId("user-status-user-1")).toBeTruthy();
      expect(getByTestId("user-status-user-2")).toBeTruthy();
    });

    it("should render tokens for completed referrals", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      // User with tokens
      expect(getByTestId("user-tokens-user-1")).toBeTruthy();

      // User without tokens (pending status)
      expect(queryByTestId("user-tokens-user-2")).toBeNull();
    });

    it("should render dates", () => {
      const { getByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      expect(getByTestId("user-date-user-1")).toBeTruthy();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no users", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferredUsersList users={[]} />,
      );

      expect(getByTestId("empty-state")).toBeTruthy();
      expect(queryByTestId("referred-user-user-1")).toBeNull();
    });

    it("should display appropriate empty message", () => {
      const { getByText } = render(<ReferredUsersList users={[]} />);

      expect(getByText("No referrals yet")).toBeTruthy();
      expect(
        getByText(/Share your referral link with friends/),
      ).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("should show loading state when isLoading is true and no users", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferredUsersList users={[]} isLoading={true} />,
      );

      expect(getByTestId("loading-state")).toBeTruthy();
      expect(queryByTestId("empty-state")).toBeNull();
    });

    it("should show list when loading with existing users", () => {
      const { getByTestId, queryByTestId } = render(
        <ReferredUsersList users={mockUsers} isLoading={true} />,
      );

      expect(getByTestId("referred-users-list")).toBeTruthy();
      expect(queryByTestId("loading-state")).toBeNull();
    });
  });

  describe("Load More", () => {
    it("should show load more button when hasMore is true", () => {
      const onLoadMore = jest.fn();
      const { getByTestId } = render(
        <ReferredUsersList
          users={mockUsers}
          hasMore={true}
          onLoadMore={onLoadMore}
        />,
      );

      expect(getByTestId("load-more-button")).toBeTruthy();
    });

    it("should not show load more button when hasMore is false", () => {
      const { queryByTestId } = render(
        <ReferredUsersList users={mockUsers} hasMore={false} />,
      );

      expect(queryByTestId("load-more-button")).toBeNull();
    });

    it("should not show load more button when loading", () => {
      const { queryByTestId } = render(
        <ReferredUsersList
          users={mockUsers}
          hasMore={true}
          isLoading={true}
        />,
      );

      expect(queryByTestId("load-more-button")).toBeNull();
    });

    it("should call onLoadMore when button is pressed", () => {
      const onLoadMore = jest.fn();
      const { getByTestId } = render(
        <ReferredUsersList
          users={mockUsers}
          hasMore={true}
          onLoadMore={onLoadMore}
        />,
      );

      fireEvent.press(getByTestId("load-more-button"));

      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  describe("Refresh", () => {
    it("should support pull-to-refresh", () => {
      const onRefresh = jest.fn();
      const { getByTestId } = render(
        <ReferredUsersList
          users={mockUsers}
          onRefresh={onRefresh}
          isRefreshing={false}
        />,
      );

      const list = getByTestId("referred-users-list");
      expect(list.props.onRefresh).toBeTruthy();
    });

    it("should show refreshing state", () => {
      const onRefresh = jest.fn();
      const { getByTestId } = render(
        <ReferredUsersList
          users={mockUsers}
          onRefresh={onRefresh}
          isRefreshing={true}
        />,
      );

      const list = getByTestId("referred-users-list");
      expect(list.props.refreshing).toBe(true);
    });
  });

  describe("Status Display", () => {
    it("should show Verified for COMPLETED status", () => {
      const completedUser: ReferredUser[] = [
        {
          id: "completed-user",
          email: "completed@example.com",
          name: "Completed User",
          status: "COMPLETED",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByText } = render(
        <ReferredUsersList users={completedUser} />,
      );

      expect(getByText("Verified")).toBeTruthy();
    });

    it("should show Pending for PENDING status", () => {
      const pendingUser: ReferredUser[] = [
        {
          id: "pending-user",
          email: "pending@example.com",
          name: "Pending User",
          status: "PENDING",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 0,
        },
      ];

      const { getByText } = render(
        <ReferredUsersList users={pendingUser} />,
      );

      expect(getByText("Pending")).toBeTruthy();
    });
  });

  describe("Email Masking", () => {
    it("should mask long emails correctly", () => {
      const userWithLongEmail: ReferredUser[] = [
        {
          id: "long-email",
          email: "verylongemail@example.com",
          name: null,
          status: "COMPLETED",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithLongEmail} />,
      );

      const emailElement = getByTestId("user-email-long-email");
      const maskedEmail = emailElement.props.children;

      // Should start with first char, have asterisks, end with last char
      expect(maskedEmail).toMatch(/^v\*\*\*l@e\*\*\*e\.c\*\*\*m$/);
    });

    it("should handle short emails", () => {
      const userWithShortEmail: ReferredUser[] = [
        {
          id: "short-email",
          email: "ab@cd.com",
          name: null,
          status: "COMPLETED",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithShortEmail} />,
      );

      const emailElement = getByTestId("user-email-short-email");
      expect(emailElement.props.children).toContain("***");
    });
  });

  describe("Name Masking", () => {
    it("should mask names correctly", () => {
      const userWithName: ReferredUser[] = [
        {
          id: "named-user",
          email: "test@example.com",
          name: "John Doe",
          status: "COMPLETED",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithName} />,
      );

      const nameElement = getByTestId("user-name-named-user");
      expect(nameElement.props.children).toBe("J*** D***");
    });

    it("should handle single character names", () => {
      const userWithShortName: ReferredUser[] = [
        {
          id: "short-name",
          email: "test@example.com",
          name: "A B",
          status: "COMPLETED",
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithShortName} />,
      );

      const nameElement = getByTestId("user-name-short-name");
      expect(nameElement.props.children).toBe("A*** B***");
    });
  });

  describe("Date Formatting", () => {
    it("should format dates correctly", () => {
      const userWithDate: ReferredUser[] = [
        {
          id: "date-user",
          email: "test@example.com",
          name: null,
          status: "COMPLETED",
          createdAt: "2024-06-15T10:00:00Z",
          tokensGranted: 50,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithDate} />,
      );

      const dateElement = getByTestId("user-date-date-user");
      // Should contain "Joined" prefix and formatted date
      expect(dateElement.props.children).toContain("Joined");
    });
  });

  describe("Default Props", () => {
    it("should work with minimal props", () => {
      const { getByTestId } = render(
        <ReferredUsersList users={mockUsers} />,
      );

      expect(getByTestId("referred-users-list")).toBeTruthy();
    });
  });

  describe("Unknown Status", () => {
    it("should handle unknown status gracefully", () => {
      const userWithUnknownStatus: ReferredUser[] = [
        {
          id: "unknown-status",
          email: "test@example.com",
          name: null,
          status: "UNKNOWN" as any,
          createdAt: "2024-01-15T10:00:00Z",
          tokensGranted: 0,
        },
      ];

      const { getByTestId } = render(
        <ReferredUsersList users={userWithUnknownStatus} />,
      );

      // Should render without crashing
      expect(getByTestId("referred-user-unknown-status")).toBeTruthy();
    });
  });
});
