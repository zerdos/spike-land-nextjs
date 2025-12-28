import { Stack } from "expo-router";

export default function ReferralsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Referral Program",
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
