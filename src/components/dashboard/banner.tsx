import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import type { DataDashboard } from "../../lib/dashboard";
import { sapaan, tanggalPanjang } from "../../lib/waktu";

const INK = "#080B16";
const SURFACE = "#0F1527";
const LINE = "#1B2440";
const SNOW = "#F5F7FF";
const MIST = "#AAB4D0";
const BRAND = "#5B6CFF";
const AQUA = "#32D9FF";
const LILAC = "#A78BFA";

function IkonPanah({
  warna = SNOW,
  ukuran = 14,
  opacity = 1,
}: {
  warna?: string;
  ukuran?: number;
  opacity?: number;
}) {
  return (
    <Svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    >
      <Path d="M7 17L17 7M8 7h9v9" />
    </Svg>
  );
}

/* ---------- Bar tanggal + pil statistik ---------- */

function PilStat({
  nilai,
  label,
  onPress,
}: {
  nilai: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.pil}>
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={AQUA}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M5 12.5l4.5 4.5L19 7.5" />
      </Svg>
      <Text style={s.nilaiPil}>{nilai}</Text>
      <Text style={s.labelPil}>{label}</Text>
    </Pressable>
  );
}

export function BarTanggal({ data }: { data: DataDashboard }) {
  const router = useRouter();
  const acaraSelesai = data.agenda.filter((e) => e.status === "completed").length;

  return (
    <View style={{ gap: 10 }}>
      <Text style={s.tanggal}>{tanggalPanjang(data.zona)}</Text>
      <View style={s.barisPil}>
        <PilStat
          nilai={data.tugasSelesai}
          label="tugas selesai"
          onPress={() => router.navigate("/tugas" as never)}
        />
        <PilStat
          nilai={acaraSelesai}
          label="agenda selesai"
          onPress={() => router.navigate("/kalender" as never)}
        />
      </View>
    </View>
  );
}

/* ---------- Hiasan kartu (garis solid, sama dengan web) ---------- */

function Hiasan({
  warna,
  opacity,
  children,
}: {
  warna: string;
  opacity: number;
  children: ReactNode;
}) {
  return (
    <View style={s.dekor} pointerEvents="none">
      <Svg
        width={144}
        height={144}
        viewBox="0 0 120 120"
        fill="none"
        stroke={warna}
        strokeWidth={3}
        opacity={opacity}
      >
        {children}
      </Svg>
    </View>
  );
}

const hiasanBola = (
  <Hiasan warna={AQUA} opacity={1}>
    <Circle cx={60} cy={60} r={50} />
    <Ellipse cx={60} cy={60} rx={22} ry={50} />
    <Path d="M10 60h100M18 36h84M18 84h84" />
  </Hiasan>
);

const hiasanDaftar = (
  <Hiasan warna={SNOW} opacity={0.4}>
    <Rect x={12} y={14} width={96} height={26} rx={8} />
    <Rect x={12} y={47} width={96} height={26} rx={8} />
    <Rect x={12} y={80} width={96} height={26} rx={8} />
    <Path d="M24 27l5 5 9-10" />
  </Hiasan>
);

const hiasanBuku = (
  <Hiasan warna={INK} opacity={0.4}>
    <Path d="M60 30v66M60 30C48 22 28 22 14 28v66c14-6 34-6 46 2M60 30c12-8 32-8 46-2v66c-14-6-34-6-46 2" />
  </Hiasan>
);

const hiasanJam = (
  <Hiasan warna={INK} opacity={0.4}>
    <Circle cx={60} cy={60} r={50} />
    <Path d="M60 28v32l22 14M60 10v8M60 102v8M10 60h8M102 60h8" />
  </Hiasan>
);

function KartuBanner({
  judul,
  nilai,
  latar,
  teks,
  bergaris = false,
  dekor,
  onPress,
}: {
  judul: string;
  nilai: number;
  latar: string;
  teks: string;
  bergaris?: boolean;
  dekor: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.kartuBanner,
        { backgroundColor: latar },
        bergaris && { borderWidth: 1, borderColor: LINE },
      ]}
    >
      {dekor}
      <View style={s.barisJudulKartu}>
        <Text style={[s.judulKartu, { color: teks }]}>{judul}</Text>
        <IkonPanah warna={teks} ukuran={16} opacity={0.7} />
      </View>
      <Text style={[s.nilaiKartu, { color: teks }]}>{nilai}</Text>
    </Pressable>
  );
}

/* ---------- Banner utama ---------- */

export function Banner({
  data,
  namaSapaan,
}: {
  data: DataDashboard;
  namaSapaan: string;
}) {
  const router = useRouter();
  const ke = (rute: string) => () => router.navigate(rute as never);

  const jumlahAgenda = data.agenda.length;
  const jumlahTugas = data.tugasHariIni.length;
  const terlambat = data.tugasTerlambat.length;
  const kosong =
    jumlahAgenda === 0 && jumlahTugas === 0 && data.belajarHariIni === 0;

  const judul = kosong
    ? "Hari ini masih kosong, atur rencanamu"
    : `Hari ini kamu punya ${jumlahAgenda} agenda, ${jumlahTugas} tugas, dan ${data.belajarHariIni} sesi belajar`;

  return (
    <View style={s.banner}>
      <View style={s.teksBanner}>
        <View>
          <Text style={s.sapaan}>
            {sapaan(data.zona)}
            {namaSapaan ? `, ${namaSapaan}` : ""}
          </Text>
          <Text style={s.judulBanner}>{judul}</Text>
          <Text style={s.subBanner}>
            {terlambat > 0
              ? `${terlambat} tugas sudah lewat tenggat.`
              : "Tidak ada tugas yang terlambat."}
          </Text>
        </View>

        <Pressable onPress={ke("/tugas")} style={s.tombolLihat}>
          <Text style={s.teksTombolLihat}>Lihat tugas</Text>
          <IkonPanah warna={INK} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.deretKartu}
      >
        <KartuBanner
          judul="Agenda hari ini"
          nilai={jumlahAgenda}
          latar="rgba(8,11,22,0.7)"
          teks={SNOW}
          bergaris
          dekor={hiasanBola}
          onPress={ke("/kalender")}
        />
        <KartuBanner
          judul="Tugas hari ini"
          nilai={jumlahTugas}
          latar={BRAND}
          teks={SNOW}
          dekor={hiasanDaftar}
          onPress={ke("/tugas")}
        />
        <KartuBanner
          judul="Belajar hari ini"
          nilai={data.belajarHariIni}
          latar={AQUA}
          teks={INK}
          dekor={hiasanBuku}
          onPress={ke("/belajar")}
        />
        <KartuBanner
          judul="Terlambat"
          nilai={terlambat}
          latar={LILAC}
          teks={INK}
          dekor={hiasanJam}
          onPress={ke("/tugas")}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tanggal: { fontSize: 14, color: MIST },
  barisPil: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  nilaiPil: { fontSize: 12, fontWeight: "700", color: SNOW },
  labelPil: { fontSize: 12, color: MIST },

  banner: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    overflow: "hidden",
  },
  teksBanner: { padding: 24, gap: 28 },
  sapaan: { fontSize: 14, color: MIST },
  judulBanner: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "600",
    color: SNOW,
  },
  subBanner: { marginTop: 12, fontSize: 14, color: MIST },
  tombolLihat: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: SNOW,
  },
  teksTombolLihat: { fontSize: 14, fontWeight: "600", color: INK },

  deretKartu: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  kartuBanner: {
    width: 176,
    height: 224,
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  dekor: { position: "absolute", right: -24, bottom: -24 },
  barisJudulKartu: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  judulKartu: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "500" },
  nilaiKartu: { fontSize: 48, lineHeight: 52, fontWeight: "600" },
});