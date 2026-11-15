import { Tabs } from "expo-router";
import BarAtas from "../../components/bar-atas";
import DockMenu from "../../components/dock-menu";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <DockMenu {...props} />}
      screenOptions={{
        headerShown: true,
        header: () => <BarAtas />,
        sceneStyle: { backgroundColor: "#080B16" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="kalender" options={{ title: "Kalender" }} />
      <Tabs.Screen name="tugas" options={{ title: "Tugas" }} />
      <Tabs.Screen name="belajar" options={{ title: "Belajar" }} />
      <Tabs.Screen name="keuangan" options={{ title: "Keuangan" }} />
    </Tabs>
  );
}