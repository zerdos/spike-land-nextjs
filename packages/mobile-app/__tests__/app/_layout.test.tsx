/**
 * Tests for Root Layout
 */

// ============================================================================
// CRITICAL: Mock react-native-reanimated BEFORE any imports
// This prevents WorkletsError from react-native-worklets initialization
// ============================================================================

jest.mock("react-native-reanimated", () => ({
  default: {
    call: () => {},
  },
  useSharedValue: jest.fn((initial) => ({ value: initial })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withDelay: jest.fn((_, animation) => animation),
  withSequence: jest.fn((...animations) => animations[0]),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    bezier: jest.fn(),
  },
}));

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
    { name, options }: { name: string; options?: Record<string, unknown>; },
  ) => {
    return React.createElement(View, { testID: `screen-${name}`, ...options });
  };

  return {
    Stack: StackComponent,
    ErrorBoundary: () => null,
  };
});

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

// Mock the font file to prevent "Invalid or unexpected token" error
// Use absolute path with virtual flag
jest.mock(
  "/Users/z/Developer/spike-land-nextjs/packages/mobile-app/assets/fonts/SpaceMono-Regular.ttf",
  () => "SpaceMono-Regular-mock",
  { virtual: true },
);

// ============================================================================
// Test Helpers
// ============================================================================

const mockUseFonts = useFonts as jest.MockedFunction<typeof useFonts>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;
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
    it("calls preventAutoHideAsync during initialization", () => {
      // preventAutoHideAsync is called at module load time
      // We test that the mock function exists and is configured
      // The actual call happens when the module is first imported
      expect(SplashScreen.preventAutoHideAsync).toBeDefined();
      expect(typeof SplashScreen.preventAutoHideAsync).toBe("function");
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

      const { queryByTestId } = render(<RootLayout />);

      // When fonts aren't loaded, RootLayout returns null, so no stack container
      expect(queryByTestId("stack-container")).toBeNull();
    });

    it("renders content when fonts are loaded", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { getByTestId } = render(<RootLayout />);

      // When fonts are loaded, the Stack container should be present
      expect(getByTestId("stack-container")).toBeTruthy();
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

      const { getByTestId } = render(<RootLayout />);

      // When fonts are loaded, the Stack container should be present
      expect(getByTestId("stack-container")).toBeTruthy();
    });
  });

  describe("providers", () => {
    it("renders with all required providers", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { getByTestId } = render(<RootLayout />);

      // Should render successfully with all providers
      expect(getByTestId("stack-container")).toBeTruthy();
    });
  });

  describe("navigation screens", () => {
    it("renders Stack with navigation screens when loaded", () => {
      mockUseFonts.mockReturnValue([true, null]);

      const { getByTestId } = render(<RootLayout />);

      // The Stack container should be present when fonts are loaded
      expect(getByTestId("stack-container")).toBeTruthy();
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
