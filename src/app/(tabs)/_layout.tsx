import { Tabs } from "expo-router";
import { HomeHeader } from "@/src/modules/shared/components/layout/HomeHeader";
import { FloatingButton } from "@/src/modules/shared/components/layout/FloatingButton";

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          sceneStyle: { backgroundColor: "#F8FAFC" },
          tabBarStyle: {
            height: 80,
            paddingBottom: 12,
            paddingTop: 8,
            backgroundColor: "#ffffff",
            borderTopWidth: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 10,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarActiveTintColor: "#FF4500",
          tabBarInactiveTintColor: "#9CA3AF",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <HomeHeader />,
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

      <FloatingButton />
    </>
  );
}
