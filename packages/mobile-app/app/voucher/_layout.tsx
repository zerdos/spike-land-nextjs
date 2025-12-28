import { Stack } from "expo-router";

export default function VoucherLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Redeem Voucher",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
