import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { TamaguiProvider } from "tamagui";

import { useColorScheme } from "@/components/useColorScheme";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useAuthStore } from "../stores";
import config from "../tamagui.config";

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
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme={colorScheme || "light"}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
          </Stack>
        </ThemeProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
