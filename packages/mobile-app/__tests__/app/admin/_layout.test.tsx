/**
 * Admin Layout Tests
 * Tests for the admin access control and layout
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

// Mock tamagui config before any imports that use it
jest.mock("@/tamagui.config", () => ({
  __esModule: true,
  default: {},
}));

import AdminLayout from "@/app/admin/_layout";
import { useAuthStore } from "@/stores";

// Mock expo-router
const mockReplace = jest.fn();
jest.mock("expo-router", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");

  // Create Stack component as a function that renders its children
  const StackComponent = ({ children }: { children: React.ReactNode; }) => {
    return React.createElement(View, { testID: "stack-container" }, children);
  };

  // Add Screen as a property on Stack
  StackComponent.Screen = (
    { name, options }: { name: string; options: Record<string, unknown>; },
  ) => {
    return React.createElement("mock-screen", { testID: `screen-${name}`, ...options });
  };

  return {
    Redirect: ({ href }: { href: string; }) => {
      return React.createElement("mock-redirect", { testID: "redirect", href });
    },
    Stack: StackComponent,
    useRouter: () => ({
      replace: mockReplace,
    }),
  };
});

// Mock the auth store
jest.mock("@/stores", () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = useAuthStore as jest.Mock;

describe("AdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  describe("Loading State", () => {
    it("should show loading indicator while checking auth", () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Checking permissions...")).toBeTruthy();
    });
  });

  describe("Unauthenticated Access", () => {
    it("should redirect to tabs when not authenticated", () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const { getByTestId } = render(
        <AdminLayout />,
      );

      const redirect = getByTestId("redirect");
      expect(redirect.props.href).toBe("/(tabs)");
    });

    it("should redirect when authenticated but no user object", () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByTestId } = render(
        <AdminLayout />,
      );

      const redirect = getByTestId("redirect");
      expect(redirect.props.href).toBe("/(tabs)");
    });
  });

  describe("Non-Admin Access", () => {
    it("should show access denied for regular USER role", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "Regular User",
          role: "USER",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Access Denied")).toBeTruthy();
      expect(
        getByText("You don't have permission to access the admin dashboard."),
      ).toBeTruthy();
    });

    it("should show go back link for non-admin users", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "Regular User",
          role: "USER",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      const goBackLink = getByText("Go back to Home");
      expect(goBackLink).toBeTruthy();
    });

    it("should navigate to home when go back is pressed", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "Regular User",
          role: "USER",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      fireEvent.press(getByText("Go back to Home"));
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  describe("Admin Access", () => {
    it("should allow access for ADMIN role users", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "ADMIN",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { queryByText, getByTestId } = render(
        <AdminLayout />,
      );

      // Should not show access denied
      expect(queryByText("Access Denied")).toBeNull();

      // Should render stack screens
      expect(getByTestId("screen-index")).toBeTruthy();
    });

    it("should allow access for SUPER_ADMIN role users", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "super-1",
          email: "super@example.com",
          name: "Super Admin",
          role: "SUPER_ADMIN",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { queryByText, getByTestId } = render(
        <AdminLayout />,
      );

      // Should not show access denied
      expect(queryByText("Access Denied")).toBeNull();

      // Should render stack screens
      expect(getByTestId("screen-index")).toBeTruthy();
    });

    it("should render all admin screens in the stack", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "ADMIN",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByTestId } = render(
        <AdminLayout />,
      );

      expect(getByTestId("screen-index")).toBeTruthy();
      expect(getByTestId("screen-users/index")).toBeTruthy();
      expect(getByTestId("screen-users/[userId]")).toBeTruthy();
      expect(getByTestId("screen-jobs/index")).toBeTruthy();
      expect(getByTestId("screen-vouchers/index")).toBeTruthy();
      expect(getByTestId("screen-analytics")).toBeTruthy();
    });
  });

  describe("Screen Options", () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "ADMIN",
        },
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it("should set correct title for dashboard screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const dashboardScreen = getByTestId("screen-index");
      expect(dashboardScreen.props.title).toBe("Admin Dashboard");
    });

    it("should set correct title for users screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const usersScreen = getByTestId("screen-users/index");
      expect(usersScreen.props.title).toBe("User Management");
    });

    it("should set correct title for user detail screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const userDetailScreen = getByTestId("screen-users/[userId]");
      expect(userDetailScreen.props.title).toBe("User Details");
    });

    it("should set correct title for jobs screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const jobsScreen = getByTestId("screen-jobs/index");
      expect(jobsScreen.props.title).toBe("Job Queue");
    });

    it("should set correct title for vouchers screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const vouchersScreen = getByTestId("screen-vouchers/index");
      expect(vouchersScreen.props.title).toBe("Vouchers");
    });

    it("should set correct title for analytics screen", () => {
      const { getByTestId } = render(
        <AdminLayout />,
      );

      const analyticsScreen = getByTestId("screen-analytics");
      expect(analyticsScreen.props.title).toBe("Analytics");
    });
  });

  describe("Role Edge Cases", () => {
    it("should deny access for undefined role", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: undefined,
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Access Denied")).toBeTruthy();
    });

    it("should deny access for empty string role", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: "",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Access Denied")).toBeTruthy();
    });

    it("should deny access for invalid role string", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: "MODERATOR",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Access Denied")).toBeTruthy();
    });

    it("should deny access for lowercase admin role", () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: "admin",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      const { getByText } = render(
        <AdminLayout />,
      );

      expect(getByText("Access Denied")).toBeTruthy();
    });
  });
});
