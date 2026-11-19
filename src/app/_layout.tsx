import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  IntroAvelsia,
  TransisiKeluar,
  TransisiMasuk,
} from "../components/animasi-avelsia";
import { AuthProvider, useAuth } from "../lib/auth";

// Splash bawaan ditahan sampai animasi pembuka siap tampil
SplashScreen.preventAutoHideAsync().catch(() => {});

// Memutar animasi pembuka, dan animasi singkat setelah login baru
function Animasi() {
  const { session, memuat, animasiKeluar, lanjutkanKeluar, akhiriAnimasiKeluar } =
    useAuth();
  const [introSelesai, setIntroSelesai] = useState(false);
  const [transisi, setTransisi] = useState(false);
  const adaSesi = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    if (memuat) return;
    const sekarang = !!session;
    // Dari tidak login menjadi login = login baru (bukan buka aplikasi dengan sesi lama)
    if (adaSesi.current === false && sekarang) setTransisi(true);
    adaSesi.current = sekarang;
  }, [session, memuat]);

  return (
    <>
      {transisi && <TransisiMasuk onSelesai={() => setTransisi(false)} />}
      {animasiKeluar && (
        <TransisiKeluar
          onPenuh={lanjutkanKeluar}
          onSelesai={akhiriAnimasiKeluar}
        />
      )}
      {!introSelesai && <IntroAvelsia onSelesai={() => setIntroSelesai(true)} />}
    </>
  );
}

function Navigasi() {
  const { session, memuat } = useAuth();

  if (memuat) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#080B16",
        }}
      >
        <ActivityIndicator color="#32D9FF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#080B16" },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pengaturan" />
        <Stack.Screen name="tujuan/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="masuk" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Navigasi />
        <Animasi />
      </View>
    </AuthProvider>
  );
}