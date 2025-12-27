import { Stack } from "expo-router";

export default function TokensLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Tokens",
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="packages"
        options={{
          title: "Buy Tokens",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "Transaction History",
        }}
      />
    </Stack>
  );
}
