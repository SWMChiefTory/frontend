import { Tabs } from "expo-router";
import { MainHeaderLogo } from "@/src/shared/components/MainHeaderLogo";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: "#fff" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <MainHeaderLogo />,
          headerTitleAlign: "left",
          tabBarLabel: "홈",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: "프로필",
          tabBarLabel: "마이",
        }}
      />
    </Tabs>
  );
}
