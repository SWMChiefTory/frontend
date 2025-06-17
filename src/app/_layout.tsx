import { Stack } from "expo-router";
import { CustomBackButton } from "@/src/shared/components/CustomBackButton";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerLeft: () => <CustomBackButton />,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
