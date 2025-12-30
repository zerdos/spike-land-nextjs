import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, type Theme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { TamaguiProvider } from "tamagui";

import { useColorScheme } from "@/components/useColorScheme";
import { colors } from "@/constants/theme";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useAuthStore } from "../stores";
import config from "../tamagui.config";

/**
 * Custom dark theme matching the web app's design system
 * Uses spike.land brand colors instead of default React Navigation colors
 */
const SpikeLandDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary, // Pixel Cyan #00E5FF
    background: colors.background, // Deep Space #08080C
    card: colors.card, // Surface Blue
    text: colors.foreground, // White
    border: colors.border,
    notification: colors.destructive,
  },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth on app start
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Initialize push notifications after auth is complete
  // Only register with server when user is authenticated
  usePushNotifications({
    requestOnMount: true,
    registerWithServer: isAuthenticated,
    handleNavigation: true,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config} defaultTheme={colorScheme}>
          <ThemeProvider
            value={colorScheme === "dark" ? SpikeLandDarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings/index"
                options={{
                  title: "Settings",
                  headerShown: false,
                  presentation: "card",
                }}
              />
              <Stack.Screen name="tokens" options={{ headerShown: false }} />
              <Stack.Screen name="referrals" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen
                name="enhance/upload"
                options={{ title: "Upload Image", headerShown: true }}
              />
              <Stack.Screen
                name="enhance/select-tier"
                options={{ title: "Select Tier", headerShown: true }}
              />
              <Stack.Screen
                name="enhance/processing"
                options={{ title: "Processing", headerShown: false }}
              />
              <Stack.Screen
                name="pricing"
                options={{ title: "Pricing", headerShown: true }}
              />
              <Stack.Screen
                name="checkout"
                options={{ title: "Checkout", headerShown: true }}
              />
              <Stack.Screen
                name="merch/[productId]"
                options={{ title: "Product", headerShown: true }}
              />
              <Stack.Screen
                name="cart/index"
                options={{ title: "Cart", headerShown: true }}
              />
              <Stack.Screen
                name="album/[id]"
                options={{ title: "Album", headerShown: true }}
              />
              <Stack.Screen
                name="albums/index"
                options={{ title: "Albums", headerShown: true }}
              />
              <Stack.Screen
                name="albums/create"
                options={{ title: "Create Album", headerShown: true }}
              />
              <Stack.Screen
                name="canvas/[albumId]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="voucher" options={{ headerShown: false }} />
              <Stack.Screen
                name="blog/[slug]"
                options={{ title: "Blog Post", headerShown: false }}
              />
              <Stack.Screen
                name="notifications"
                options={{ title: "Notifications", headerShown: true }}
              />
              <Stack.Screen
                name="storybook"
                options={{ headerShown: false }}
              />
            </Stack>
          </ThemeProvider>
        </TamaguiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
