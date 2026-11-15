import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Avatar } from "../components/bar-atas";
import { useAuth } from "../lib/auth";
import { useProfil } from "../lib/profil";

const INK = "#080B16";
const SURFACE = "#0F1527";
const LINE = "#1B2440";
const SNOW = "#F5F7FF";
const MIST = "#AAB4D0";
const AQUA = "#32D9FF";
const MERAH = "#F87171";

const NAMA_METODE: Record<string, string> = {
  email: "Email",
  google: "Google",
  github: "GitHub",
  discord: "Discord",
  apple: "Apple",
};

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={s.baris}>
      <Text style={s.labelBaris}>{label}</Text>
      <Text style={s.nilaiBaris} numberOfLines={1}>
        {nilai}
      </Text>
    </View>
  );
}

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.judulKartu}>{judul}</Text>
      <View style={s.kartu}>{children}</View>
    </View>
  );
}

export default function Pengaturan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, keluar } = useAuth();
  const { profil } = useProfil();

  const email = session?.user.email ?? "";
  const nama = profil.username || email.split("@")[0] || "Akun saya";
  const url = profil.avatarUrl?.startsWith("http") ? profil.avatarUrl : null;

  const meta = session?.user.app_metadata as
    | { provider?: string; providers?: string[] }
    | undefined;
  const daftarMetode = Array.isArray(meta?.providers)
    ? meta.providers
    : meta?.provider
      ? [meta.provider]
      : [];
  const labelMetode = daftarMetode.length
    ? daftarMetode.map((m) => NAMA_METODE[m] ?? m).join(" + ")
    : "-";

  function kembali() {
    if (router.canGoBack()) router.back();
    else router.replace("/" as never);
  }

  return (
    <View style={[s.layar, { paddingTop: insets.top }]}>
      {/* Header: tombol kembali bulat + judul di tengah */}
      <View style={s.header}>
        <Pressable
          onPress={kembali}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={s.tombolKembali}
          hitSlop={8}
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={SNOW}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="m15 18-6-6 6-6" />
          </Svg>
        </Pressable>
        <Text style={s.judulHeader}>Pengaturan</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.isi, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Kartu profil */}
        <View style={s.kartuProfil}>
          <Avatar url={url} inisial={nama.charAt(0).toUpperCase()} ukuran={56} />
          <View style={{ flex: 1 }}>
            <Text style={s.namaProfil} numberOfLines={1}>
              {nama}
            </Text>
            <Text style={s.emailProfil} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <Kartu judul="Akun">
          <Baris label="Email" nilai={email || "-"} />
          <View style={s.garis} />
          <Baris label="Masuk via" nilai={labelMetode} />
        </Kartu>

        <Kartu judul="Preferensi">
          <Baris label="Zona waktu" nilai={profil.zona} />
          <View style={s.garis} />
          <Baris label="Fitur AI" nilai={profil.aiAktif ? "Aktif" : "Nonaktif"} />
        </Kartu>

        <Text style={s.catatan}>
          Mengubah foto, username, dan preferensi dari HP segera hadir. Untuk
          sekarang, ubah lewat web.
        </Text>

        <Pressable onPress={keluar} style={s.tombolKeluar}>
          <Text style={s.teksKeluar}>Keluar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: INK },
  header: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  tombolKembali: {
    position: "absolute",
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  judulHeader: { fontSize: 16, fontWeight: "600", color: SNOW },
  isi: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  kartuProfil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  namaProfil: { fontSize: 15, fontWeight: "600", color: SNOW },
  emailProfil: { fontSize: 12, color: MIST, marginTop: 2 },
  judulKartu: { fontSize: 13, fontWeight: "600", color: MIST, paddingHorizontal: 4 },
  kartu: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
  },
  baris: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  labelBaris: { fontSize: 14, color: MIST },
  nilaiBaris: { flex: 1, textAlign: "right", fontSize: 14, color: SNOW },
  garis: { height: 1, backgroundColor: LINE },
  catatan: { fontSize: 12, color: MIST, lineHeight: 18, paddingHorizontal: 4 },
  tombolKeluar: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  teksKeluar: { color: MERAH, fontSize: 15, fontWeight: "600" },
});