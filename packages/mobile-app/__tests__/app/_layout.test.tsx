/**
 * Tests for Root Layout
 */

import RootLayout from "@/app/_layout";
import * as usePushNotificationsModule from "@/hooks/usePushNotifications";
import { useAuthStore } from "@/stores";
import { render, waitFor } from "@testing-library/react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React from "react";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("expo-font", () => ({
  useFonts: jest.fn(),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  ErrorBoundary: () => null,
}));

jest.mock("@react-navigation/native", () => ({
  DarkTheme: {},
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode; }) => children,
}));

jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode; }) => children,
}));

jest.mock("tamagui", () => ({
  TamaguiProvider: ({ children }: { children: React.ReactNode; }) => children,
}));

jest.mock("@/components/useColorScheme", () => ({
  useColorScheme: jest.fn(() => "light"),
}));

jest.mock("@/stores", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: jest.fn(() => ({
    expoPushToken: null,
    notification: null,
    isLoading: false,
    error: null,
    isEnabled: false,
    requestPermissions: jest.fn(),
    clearNotification: jest.fn(),
  })),
}));

jest.mock("@/tamagui.config", () => ({}));

jest.mock("@expo/vector-icons/FontAwesome", () => ({
  font: {},
}));

// ============================================================================
// Test Helpers
// ============================================================================

const mockUseFonts = useFonts as jest.MockedFunction<typeof useFonts>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUsePushNotifications = usePushNotificationsModule
  .usePushNotifications as jest.MockedFunction<
    typeof usePushNotificationsModule.usePushNotifications
  >;

// ============================================================================
// Tests
// ============================================================================

describe("RootLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseFonts.mockReturnValue([true, null]);
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        initialize: jest.fn(),
        signInWithProvider: jest.fn(),
        signInWithCredentials: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshSession: jest.fn(),
        clearError: jest.fn(),
      };
      return selector(state);
    });
  });

  describe("splash screen", () => {
    it("calls preventAutoHideAsync on module load", () => {
      expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
    });

    it("hides splash screen when fonts are loaded", async () => {
      mockUseFonts.mockReturnValue([true, null]);

      render(<RootLayout />);

      await waitFor(() => {
        expect(SplashScreen.hideAsync).toHaveBeenCalled();
      });
    });

    it("does not hide splash screen while fonts are loading", () => {
      mockUseFonts.mockReturnValue([false, null]);

      render(<RootLayout />);

      expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    });
  });

  describe("font loading", () => {
    it("returns null when fonts are not loaded", () => {
      mockUseFonts.mockReturnValue([false, null]);

      const { toJSON } = render(<RootLayout />);

      expect(toJSON()).toBeNull();
    });

    it("renders content when fonts are loaded", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { toJSON } = render(<RootLayout />);

      expect(toJSON()).not.toBeNull();
    });

    it("throws error when font loading fails", () => {
      const fontError = new Error("Font loading failed");
      mockUseFonts.mockReturnValue([false, fontError]);

      expect(() => {
        render(<RootLayout />);
      }).toThrow("Font loading failed");
    });
  });

  describe("auth initialization", () => {
    it("calls initialize on mount", () => {
      const mockInitialize = jest.fn();
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          initialize: mockInitialize,
          signInWithProvider: jest.fn(),
          signInWithCredentials: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshSession: jest.fn(),
          clearError: jest.fn(),
        };
        return selector(state);
      });

      render(<RootLayout />);

      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  describe("push notifications", () => {
    it("initializes push notifications hook", () => {
      mockUseFonts.mockReturnValue([true, null]);

      render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenCalled();
    });

    it("passes requestOnMount: true to push notifications hook", () => {
      mockUseFonts.mockReturnValue([true, null]);

      render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          requestOnMount: true,
        }),
      );
    });

    it("passes registerWithServer: false when not authenticated", () => {
      mockUseFonts.mockReturnValue([true, null]);
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          initialize: jest.fn(),
          signInWithProvider: jest.fn(),
          signInWithCredentials: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshSession: jest.fn(),
          clearError: jest.fn(),
        };
        return selector(state);
      });

      render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          registerWithServer: false,
        }),
      );
    });

    it("passes registerWithServer: true when authenticated", () => {
      mockUseFonts.mockReturnValue([true, null]);
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          isAuthenticated: true,
          user: { id: "user-1", email: "test@test.com" },
          isLoading: false,
          error: null,
          initialize: jest.fn(),
          signInWithProvider: jest.fn(),
          signInWithCredentials: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshSession: jest.fn(),
          clearError: jest.fn(),
        };
        return selector(state);
      });

      render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          registerWithServer: true,
        }),
      );
    });

    it("passes handleNavigation: true to push notifications hook", () => {
      mockUseFonts.mockReturnValue([true, null]);

      render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNavigation: true,
        }),
      );
    });
  });

  describe("theme handling", () => {
    it("renders with light color scheme", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { toJSON } = render(<RootLayout />);

      expect(toJSON()).not.toBeNull();
    });
  });

  describe("providers", () => {
    it("renders with all required providers", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { toJSON } = render(<RootLayout />);

      // Should render successfully with all providers
      expect(toJSON()).not.toBeNull();
    });
  });

  describe("navigation screens", () => {
    it("renders Stack with navigation screens when loaded", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { toJSON } = render(<RootLayout />);

      // The component should render successfully
      expect(toJSON()).not.toBeNull();
    });
  });

  describe("error handling", () => {
    it("propagates font loading error through effect", () => {
      const fontError = new Error("Failed to load fonts");
      mockUseFonts.mockReturnValue([false, fontError]);

      expect(() => {
        render(<RootLayout />);
      }).toThrow("Failed to load fonts");
    });
  });

  describe("auth state changes", () => {
    it("updates push notification registration when auth state changes", () => {
      // First render with unauthenticated
      mockUseFonts.mockReturnValue([true, null]);
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          initialize: jest.fn(),
          signInWithProvider: jest.fn(),
          signInWithCredentials: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshSession: jest.fn(),
          clearError: jest.fn(),
        };
        return selector(state);
      });

      const { rerender } = render(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({
          registerWithServer: false,
        }),
      );

      // Update to authenticated
      mockUseAuthStore.mockImplementation((selector) => {
        const state = {
          isAuthenticated: true,
          user: { id: "user-1", email: "test@test.com" },
          isLoading: false,
          error: null,
          initialize: jest.fn(),
          signInWithProvider: jest.fn(),
          signInWithCredentials: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn(),
          refreshSession: jest.fn(),
          clearError: jest.fn(),
        };
        return selector(state);
      });

      rerender(<RootLayout />);

      expect(mockUsePushNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({
          registerWithServer: true,
        }),
      );
    });
  });
});
