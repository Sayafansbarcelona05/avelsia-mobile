import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export const C = {
  ink: "#080B16",
  surface: "#0F1527",
  line: "#1B2440",
  snow: "#F5F7FF",
  mist: "#AAB4D0",
  brand: "#5B6CFF",
  aqua: "#32D9FF",
  lilac: "#A78BFA",
  baris: "rgba(8,11,22,0.5)",
};

export function IkonPanah({
  warna = C.snow,
  ukuran = 14,
}: {
  warna?: string;
  ukuran?: number;
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
    >
      <Path d="M7 17L17 7M8 7h9v9" />
    </Svg>
  );
}

export function IkonJam({
  warna = C.snow,
  ukuran = 16,
}: {
  warna?: string;
  ukuran?: number;
}) {
  return (
    <Svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function TagTitik({ label, warna }: { label: string; warna: string }) {
  return (
    <View style={s.tag}>
      <View style={[s.titik, { backgroundColor: warna }]} />
      <Text style={s.teksTag}>{label}</Text>
    </View>
  );
}

export function KondisiKosong({
  warna,
  judul,
  deskripsi,
  aksi,
  onAksi,
}: {
  warna: string;
  judul: string;
  deskripsi: string;
  aksi?: string;
  onAksi?: () => void;
}) {
  return (
    <View style={s.kosong}>
      <View style={[s.bolaKosong, { backgroundColor: warna }]} />
      <View style={s.cincinKosong} />
      <Text style={s.judulKosong}>{judul}</Text>
      <Text style={s.deskKosong}>{deskripsi}</Text>
      {aksi && onAksi ? (
        <Pressable onPress={onAksi} style={s.tombolAksi}>
          <Text style={s.teksAksi}>{aksi}</Text>
          <IkonPanah />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PanelKartu({
  judul,
  sub,
  rute,
  children,
}: {
  judul: string;
  sub?: string;
  rute?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={s.kartu}>
      <View style={s.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={s.judul}>{judul}</Text>
          {sub ? (
            <Text style={s.sub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        {rute ? (
          <Pressable
            onPress={() => router.navigate(rute as never)}
            style={s.tombolSemua}
          >
            <Text style={s.teksSemua}>Lihat semua</Text>
            <IkonPanah warna={C.ink} ukuran={12} />
          </Pressable>
        ) : null}
      </View>
      <View style={s.isi}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  kartu: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 20,
  },
  kepala: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  judul: { fontSize: 20, fontWeight: "600", color: C.snow },
  sub: { marginTop: 6, fontSize: 12, color: C.mist },
  tombolSemua: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.snow,
  },
  teksSemua: { fontSize: 12, fontWeight: "600", color: C.ink },
  isi: { marginTop: 20, gap: 8 },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  titik: { width: 6, height: 6, borderRadius: 3 },
  teksTag: { fontSize: 12, color: C.mist },

  kosong: {
    minHeight: 170,
    borderRadius: 16,
    backgroundColor: C.baris,
    padding: 20,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bolaKosong: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  cincinKosong: {
    position: "absolute",
    right: 64,
    top: 64,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: C.line,
  },
  judulKosong: { fontSize: 20, fontWeight: "600", color: C.snow },
  deskKosong: { marginTop: 6, fontSize: 12, lineHeight: 18, color: C.mist },
  tombolAksi: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  teksAksi: { fontSize: 14, fontWeight: "500", color: C.snow },
});