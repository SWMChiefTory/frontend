import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: "쉐프토리",
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
