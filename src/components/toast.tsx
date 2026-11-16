import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { C } from "./dashboard/panel-kartu";

export type JenisToast = "sukses" | "peringatan" | "galat";

type Item = { id: number; jenis: JenisToast; judul: string; pesan?: string };

/* ====== Penyimpanan sederhana di luar React, supaya toast bisa dipanggil dari mana saja ====== */
let daftar: Item[] = [];
let nomor = 0;
const pendengar = new Set<() => void>();

function umumkan() {
  for (const f of pendengar) f();
}
function langganan(f: () => void) {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}
const ambil = () => daftar;

function hapus(id: number) {
  daftar = daftar.filter((t) => t.id !== id);
  umumkan();
}

function tambah(jenis: JenisToast, judul: string, pesan?: string) {
  nomor += 1;
  daftar = [...daftar.slice(-3), { id: nomor, jenis, judul, pesan }]; // maksimal 4 sekaligus
  umumkan();
}

export const toast = {
  sukses: (judul: string, pesan?: string) => tambah("sukses", judul, pesan),
  peringatan: (judul: string, pesan?: string) =>
    tambah("peringatan", judul, pesan),
  galat: (judul: string, pesan?: string) => tambah("galat", judul, pesan),
};

/* ====== Tampilan ====== */
const GAYA: Record<
  JenisToast,
  { bulat: string; ikon: string; durasi: number }
> = {
  sukses: { bulat: C.aqua, ikon: C.ink, durasi: 4500 },
  peringatan: { bulat: C.lilac, ikon: C.ink, durasi: 7000 },
  galat: { bulat: C.brand, ikon: C.snow, durasi: 6000 },
};

function IkonToast({ jenis, warna }: { jenis: JenisToast; warna: string }) {
  const d =
    jenis === "sukses"
      ? "M5 12.5l4.5 4.5L19 7.5"
      : jenis === "peringatan"
        ? "M12 5v8M12 17.5h.01"
        : "M7 7l10 10M17 7L7 17";
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={d} />
    </Svg>
  );
}

function ItemToast({ item }: { item: Item }) {
  const muncul = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menutup = useRef(false);
  const gaya = GAYA[item.jenis];

  const tutup = useCallback(() => {
    if (menutup.current) return;
    menutup.current = true;
    clearTimeout(timer.current);
    Animated.timing(muncul, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => hapus(item.id));
  }, [item.id, muncul]);

  useEffect(() => {
    Animated.timing(muncul, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    timer.current = setTimeout(tutup, gaya.durasi);
    return () => clearTimeout(timer.current);
  }, [muncul, tutup, gaya.durasi]);

  const geserY = muncul.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[s.item, { opacity: muncul, transform: [{ translateY: geserY }] }]}
    >
      <View style={[s.bulat, { backgroundColor: gaya.bulat }]}>
        <IkonToast jenis={item.jenis} warna={gaya.ikon} />
      </View>
      <View style={s.teks}>
        <Text style={s.judul}>{item.judul}</Text>
        {item.pesan ? <Text style={s.pesan}>{item.pesan}</Text> : null}
      </View>
      <Pressable
        onPress={tutup}
        accessibilityRole="button"
        accessibilityLabel="Tutup notifikasi"
        hitSlop={10}
        style={s.tutup}
      >
        <Svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.mist}
          strokeWidth={2}
          strokeLinecap="round"
        >
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

/* Pasang satu kali di layar. Tidak menampilkan apa pun kalau tidak ada toast. */
export function WadahToast() {
  const isi = useSyncExternalStore(langganan, ambil, ambil);
  if (isi.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={s.wadah}>
      {isi.map((t) => (
        <ItemToast key={t.id} item={t} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 100,
    elevation: 100,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  bulat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  teks: { flex: 1, minWidth: 0, paddingTop: 2 },
  judul: { fontSize: 14, fontWeight: "600", color: C.snow },
  pesan: { marginTop: 2, fontSize: 12, lineHeight: 18, color: C.mist },
  tutup: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});