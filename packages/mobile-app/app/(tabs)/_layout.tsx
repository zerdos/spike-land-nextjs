import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "tamagui";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { colors } from "@/constants/theme";
import { useCartStore } from "@/stores";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function CartTabIcon({ color }: { color: string; }) {
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <View style={{ position: "relative" }}>
      <TabBarIcon name="shopping-cart" color={color} />
      {itemCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -10,
            backgroundColor: "#ef4444",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text fontSize={11} color="white" fontWeight="bold">
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  // Force dark theme to match web app styling
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.pixelCyan,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: "#ffffff",
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={colors.foreground}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="merch"
        options={{
          title: "Shop",
          tabBarIcon: ({ color }) => <TabBarIcon name="shopping-bag" color={color} />,
          headerRight: () => (
            <Link href="/cart" asChild>
              <Pressable>
                {({ pressed }) => (
                  <View style={{ opacity: pressed ? 0.5 : 1, marginRight: 15 }}>
                    <CartTabIcon color={colors.foreground} />
                  </View>
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color }) => <TabBarIcon name="photo" color={color} />,
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: "Blog",
          tabBarIcon: ({ color }) => <TabBarIcon name="newspaper-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
