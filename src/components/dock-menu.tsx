import { useRouter, type Tabs } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type PropsDock = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const INK = "#080B16";
const SURFACE = "#0F1527";
const SNOW = "#F5F7FF";
const MIST = "#AAB4D0";
const BRAND = "#5B6CFF";
const AQUA = "#32D9FF";
const LILAC = "#A78BFA";

// Urutan menu mengikuti web. Nama = nama file di src/app/(tabs)
const MENU: Record<string, { label: string; warna: string; teks: string }> = {
  index: { label: "Beranda", warna: BRAND, teks: SNOW },
  kalender: { label: "Kalender", warna: LILAC, teks: INK },
  tugas: { label: "Tugas", warna: AQUA, teks: INK },
  belajar: { label: "Belajar", warna: BRAND, teks: SNOW },
  keuangan: { label: "Keuangan", warna: AQUA, teks: INK },
};

// Ikon yang sama dengan sidebar web
const IKON: Record<string, ReactNode> = {
  index: <Path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  kalender: (
    <>
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  tugas: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8 12.5l3 3 5-6" />
    </>
  ),
  belajar: (
    <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
  ),
  keuangan: (
    <>
      <Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
};

function Ikon({ nama, ukuran, warna }: { nama: string; ukuran: number; warna: string }) {
  return (
    <Svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {IKON[nama]}
    </Svg>
  );
}

export default function DockMenu({ state }: PropsDock) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lebar, setLebar] = useState(0);

  const daftar = state.routes.filter((r) => r.name in MENU);
  const aktifKey = state.routes[state.index]?.key;
  const idx = Math.max(
    0,
    daftar.findIndex((r) => r.key === aktifKey)
  );

  // Posisi lingkaran (angka pecahan saat bergeser)
  const pos = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    Animated.spring(pos, {
      toValue: idx,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [idx, pos]);

  const slot = lebar / daftar.length;
  const urutan = daftar.map((_, i) => i);

  // 1 saat tab ke-i aktif, 0 saat jauh
  const aktivitas = (i: number) =>
    pos.interpolate({
      inputRange: [i - 1, i, i + 1],
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });

  const geserX = pos.interpolate({
    inputRange: urutan,
    outputRange: urutan.map((i) => i * slot),
  });

  function tekan(nama: string, fokus: boolean) {
    if (fokus) return;
    // "(tabs)" tidak ikut di URL: index = "/", lainnya "/kalender", dst.
    router.navigate((nama === "index" ? "/" : `/${nama}`) as never);
  }

  return (
    <View
      style={[s.pembungkus, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View
        style={s.dock}
        onLayout={(e) => setLebar(e.nativeEvent.layout.width)}
      >
        {/* Lingkaran penanda: satu elemen yang hanya bergeser */}
        {lebar > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.jalurLingkaran,
              { width: slot, transform: [{ translateX: geserX }] },
            ]}
          >
            <View style={[s.lingkaran, { left: (slot - 68) / 2 }]}>
              {daftar.map((r, i) => (
                <Animated.View
                  key={r.key}
                  style={[
                    StyleSheet.absoluteFill,
                    s.isiLingkaran,
                    { backgroundColor: MENU[r.name].warna, opacity: aktivitas(i) },
                  ]}
                >
                  <Ikon nama={r.name} ukuran={24} warna={MENU[r.name].teks} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Deretan tab */}
        <View style={s.baris}>
          {daftar.map((r, i) => {
            const fokus = i === idx;
            const akt = aktivitas(i);
            return (
              <Pressable
                key={r.key}
                onPress={() => tekan(r.name, fokus)}
                accessibilityRole="button"
                accessibilityLabel={MENU[r.name].label}
                accessibilityState={{ selected: fokus }}
                style={s.tab}
              >
                <Animated.View
                  style={{
                    opacity: akt.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        scale: akt.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.75],
                        }),
                      },
                    ],
                  }}
                >
                  <Ikon nama={r.name} ukuran={20} warna={MIST} />
                </Animated.View>
                <Animated.Text
                  style={[
                    s.label,
                    {
                      opacity: akt,
                      transform: [
                        {
                          translateY: akt.interpolate({
                            inputRange: [0, 1],
                            outputRange: [4, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {MENU[r.name].label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pembungkus: {
    backgroundColor: INK,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  dock: {
    height: 64,
    width: "100%",
    maxWidth: 384,
    alignSelf: "center",
    borderRadius: 28,
    backgroundColor: SURFACE,
  },
  jalurLingkaran: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  lingkaran: {
    position: "absolute",
    top: -26,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 6,
    borderColor: SURFACE,
    overflow: "hidden",
  },
  isiLingkaran: {
    alignItems: "center",
    justifyContent: "center",
  },
  baris: {
    flex: 1,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    bottom: 6,
    fontSize: 10,
    fontWeight: "600",
    color: SNOW,
  },
});