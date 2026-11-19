import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  IkonApi,
  IkonBuku,
  IkonCentang,
  IkonJam,
  IkonKalender,
  IkonPanah,
} from "../../components/belajar/ikon";
import LatarGradien from "../../components/belajar/latar-gradien";
import { C } from "../../components/dashboard/panel-kartu";
import {
  formatTanggalPendek,
  hitungBelajar,
  JUMLAH_MINGGU,
  useBelajar,
} from "../../lib/belajar";
import { formatMenit } from "../../lib/format";

const TAB = [
  { kunci: "aktif", label: "Aktif", status: "active" },
  { kunci: "selesai", label: "Selesai", status: "completed" },
  { kunci: "arsip", label: "Diarsipkan", status: "archived" },
] as const;

const LABEL_LEVEL: Record<string, string> = {
  pemula: "Pemula",
  menengah: "Menengah",
  mahir: "Mahir",
};

// Warna lencana, panel ilustrasi, dan ikon per level (sama seperti web)
const GAYA_LEVEL: Record<string, { warna: string; ikon: string }> = {
  pemula: { warna: C.aqua, ikon: C.ink },
  menengah: { warna: C.brand, ikon: C.snow },
  mahir: { warna: C.lilac, ikon: C.ink },
};
const GAYA_NETRAL = { warna: C.mist, ikon: C.ink };

// Kepekatan sel heatmap (warna ink di atas kartu gradien)
const OPASITAS_SEL = [0.1, 0.3, 0.5, 0.7, 1];

export default function Belajar() {
  const router = useRouter();
  const { hariIni, data, memuat, menyegarkan, galat, muat, segarkan } =
    useBelajar();
  const [tabAktif, setTabAktif] = useState<(typeof TAB)[number]["kunci"]>(
    "aktif"
  );

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const ringkasan = useMemo(
    () => (data && hariIni ? hitungBelajar(data, hariIni) : null),
    [data, hariIni]
  );

  if (memuat && !data) {
    return (
      <View style={s.tengah}>
        <ActivityIndicator color={C.aqua} />
      </View>
    );
  }

  if (!data || !ringkasan) {
    return (
      <View style={s.tengah}>
        <Text style={s.judul}>Belajar</Text>
        <Text style={s.redup}>
          {galat
            ? "Data belajar belum bisa dimuat. Periksa koneksi lalu coba lagi."
            : "Memuat..."}
        </Text>
        {galat ? (
          <Pressable onPress={muat} style={s.tombolUlang} accessibilityRole="button">
            <Text style={s.teksTombolUlang}>Coba lagi</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const jumlah = (status: string) =>
    data.tujuan.filter((g) => g.status === status).length;
  const tabSekarang = TAB.find((t) => t.kunci === tabAktif) ?? TAB[0];
  const daftar = data.tujuan.filter((g) => g.status === tabSekarang.status);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.isi}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={segarkan}
          tintColor={C.aqua}
          colors={[C.aqua]}
        />
      }
    >
      <View>
        <Text style={s.judul}>Belajar</Text>
        <Text style={s.redup}>
          Susun tujuan belajar, pecah jadi topik, lalu catat sesinya.
        </Text>
      </View>

      {/* Ringkasan: satu kartu, tiga baris berikon */}
      <View style={s.kartuRingkas}>
        <BarisStatistik
          ikon={<IkonBuku warna={C.aqua} />}
          warna={C.aqua}
          label="Tujuan aktif"
          nilai={jumlah("active")}
          keterangan="sedang berjalan"
        />
        <BarisStatistik
          ikon={<IkonJam warna={C.snow} />}
          warna={C.brand}
          label="Menit minggu ini"
          nilai={ringkasan.menitMingguIni}
          keterangan={formatMenit(ringkasan.menitMingguIni)}
          garis
        />
        <BarisStatistik
          ikon={<IkonCentang warna={C.lilac} />}
          warna={C.lilac}
          label="Sesi selesai"
          nilai={ringkasan.sesiMingguIni}
          keterangan="minggu ini"
          garis
        />
      </View>

      {/* Tab status tujuan (bergaris bawah) */}
      <View style={s.barTab}>
        {TAB.map((t) => {
          const on = t.kunci === tabAktif;
          return (
            <Pressable
              key={t.kunci}
              onPress={() => setTabAktif(t.kunci)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[s.tab, on && s.tabOn]}
            >
              <Text style={[s.teksTab, on && s.teksTabOn]}>{t.label}</Text>
              <View style={[s.hitung, on && s.hitungOn]}>
                <Text style={[s.teksHitung, on && { color: C.ink }]}>
                  {jumlah(t.status)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Daftar tujuan */}
      {daftar.length === 0 ? (
        <View style={s.kosong}>
          <Text style={s.teksKosong}>
            {tabSekarang.kunci === "aktif"
              ? "Belum ada tujuan belajar aktif."
              : `Belum ada tujuan di tab ${tabSekarang.label}.`}
          </Text>
        </View>
      ) : (
        daftar.map((g) => {
          const tp = ringkasan.topikPerTujuan.get(g.id) ?? {
            total: 0,
            selesai: 0,
          };
          const persen = tp.total
            ? Math.round((tp.selesai / tp.total) * 100)
            : 0;
          const menit = ringkasan.menitPerTujuan.get(g.id) ?? 0;
          const gaya =
            (g.starting_level && GAYA_LEVEL[g.starting_level]) || GAYA_NETRAL;
          return (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/tujuan/${g.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`Buka tujuan ${g.title}`}
              style={({ pressed }) => [s.kartu, pressed && { opacity: 0.85 }]}
            >
              {/* Panel ilustrasi: bentuk geometri pengganti gambar kursus */}
              <View style={s.panel}>
                <LatarGradien
                  dari={gaya.warna}
                  ke={C.brand}
                  opasDari={0.35}
                  opasKe={0.1}
                  radius={12}
                />
                <View style={s.bulatPanel} />
                <View style={s.kotakPanel} />
                <View style={[s.ubinPanel, { backgroundColor: gaya.warna }]}>
                  <IkonBuku warna={gaya.ikon} ukuran={28} />
                </View>
              </View>

              <View style={s.barisLencana}>
                <View
                  style={[s.lencana, { backgroundColor: `${gaya.warna}26` }]}
                >
                  <Text style={[s.teksLencana, { color: gaya.warna }]}>
                    {g.starting_level
                      ? (LABEL_LEVEL[g.starting_level] ?? g.starting_level)
                      : "Level belum diisi"}
                  </Text>
                </View>
                {g.target_date ? (
                  <View style={s.info}>
                    <IkonKalender warna={C.mist} ukuran={14} />
                    <Text style={s.kecil}>
                      Target {formatTanggalPendek(g.target_date)}
                    </Text>
                  </View>
                ) : null}
                <View style={{ marginLeft: "auto" }}>
                  <IkonPanah warna={C.mist} ukuran={16} />
                </View>
              </View>

              <Text style={s.judulKartu} numberOfLines={2}>
                {g.title}
              </Text>

              <View style={s.barisInfo}>
                <View style={s.info}>
                  <IkonBuku warna={C.mist} ukuran={14} />
                  <Text style={s.kecil}>
                    {tp.total ? `${tp.total} topik` : "Belum ada topik"}
                  </Text>
                </View>
                {g.weekly_minutes != null ? (
                  <View style={s.info}>
                    <IkonJam warna={C.mist} ukuran={14} />
                    <Text style={s.kecil}>
                      {formatMenit(g.weekly_minutes)}/minggu
                    </Text>
                  </View>
                ) : null}
              </View>

              {g.target_outcome ? (
                <Text style={s.redup} numberOfLines={2}>
                  {g.target_outcome}
                </Text>
              ) : null}
              {g.completion_criteria ? (
                <Text style={s.kecil} numberOfLines={2}>
                  Selesai jika: {g.completion_criteria}
                </Text>
              ) : null}

              <View style={{ marginTop: 6 }}>
                <View style={s.barisProgres}>
                  <Text style={s.kecil}>
                    {tp.total
                      ? `${tp.selesai} dari ${tp.total} topik selesai`
                      : "Progress"}
                  </Text>
                  <Text style={s.persen}>{persen}%</Text>
                </View>
                <View style={s.jalur}>
                  {persen > 0 ? (
                    <View style={[s.isiJalur, { width: `${persen}%` }]}>
                      <LatarGradien dari={C.aqua} ke={C.brand} radius={999} />
                    </View>
                  ) : null}
                </View>
                <Text style={[s.kecil, { marginTop: 8 }]}>
                  Total belajar {formatMenit(menit)}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      {/* Keaktifan belajar: kartu gradien, streak + heatmap 12 minggu */}
      <View style={s.kartuAktif}>
        <LatarGradien dari={C.aqua} ke={C.lilac} radius={16} />
        <View style={s.barisAktif}>
          <IkonApi warna={C.ink} />
          <Text style={s.labelAktif}>Keaktifan belajar</Text>
        </View>

        <Text style={s.streak}>
          {ringkasan.streakSaatIni}{" "}
          <Text style={s.streakSatuan}>hari beruntun</Text>
        </Text>
        <Text style={s.tekGelap}>
          {ringkasan.streakSaatIni > 0
            ? `Terpanjang ${ringkasan.streakTerpanjang} hari`
            : ringkasan.streakTerpanjang > 0
              ? `Terpanjang ${ringkasan.streakTerpanjang} hari. Catat satu sesi hari ini untuk mulai lagi.`
              : "Catat sesi belajar pertama untuk memulai streak."}
        </Text>

        <View
          style={s.heatmap}
          accessibilityLabel={`Peta keaktifan ${JUMLAH_MINGGU} minggu terakhir: ${ringkasan.hariAktif} hari ada sesi belajar`}
        >
          {ringkasan.heatmap.map((kolom, i) => (
            <View key={i} style={s.kolom}>
              {kolom.map((c) => (
                <View
                  key={c.tanggal}
                  style={[
                    s.sel,
                    {
                      backgroundColor: c.akan
                        ? "transparent"
                        : `rgba(8,11,22,${OPASITAS_SEL[c.level]})`,
                    },
                    c.hariIni && s.selHariIni,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={s.kaki}>
          <Text style={s.tekGelapKecil}>
            {ringkasan.hariAktif} hari aktif dalam {JUMLAH_MINGGU} minggu
          </Text>
          <View style={s.legenda}>
            <Text style={s.tekGelapKecil}>Sedikit</Text>
            {OPASITAS_SEL.map((o) => (
              <View
                key={o}
                style={[s.selLegenda, { backgroundColor: `rgba(8,11,22,${o})` }]}
              />
            ))}
            <Text style={s.tekGelapKecil}>Banyak</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function BarisStatistik({
  ikon,
  warna,
  label,
  nilai,
  keterangan,
  garis,
}: {
  ikon: ReactNode;
  warna: string;
  label: string;
  nilai: number;
  keterangan: string;
  garis?: boolean;
}) {
  return (
    <View style={[s.barisStat, garis && s.garisAtas]}>
      <View style={[s.ubinStat, { backgroundColor: `${warna}26` }]}>{ikon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.kecil}>{label}</Text>
        <View style={s.barisNilai}>
          <Text style={s.nilaiStat}>{nilai}</Text>
          <Text style={s.kecil} numberOfLines={1}>
            {keterangan}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // paddingBottom besar supaya isi tidak tertutup dock; samakan dengan kalender.tsx kalau beda
  isi: { padding: 20, paddingBottom: 130, gap: 16 },
  tengah: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  judul: { fontSize: 24, fontWeight: "700", color: C.snow },
  redup: { fontSize: 14, lineHeight: 20, color: C.mist },
  kecil: { fontSize: 12, color: C.mist },
  tombolUlang: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.aqua,
  },
  teksTombolUlang: { fontSize: 14, fontWeight: "600", color: C.ink },

  kartuRingkas: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  barisStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  garisAtas: { borderTopWidth: 1, borderTopColor: C.line },
  ubinStat: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  barisNilai: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  nilaiStat: { fontSize: 24, fontWeight: "700", color: C.snow },

  barTab: {
    flexDirection: "row",
    gap: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabOn: { borderBottomColor: C.aqua },
  teksTab: { fontSize: 14, color: C.mist },
  teksTabOn: { color: C.snow, fontWeight: "600" },
  hitung: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  hitungOn: { backgroundColor: C.aqua },
  teksHitung: { fontSize: 11, fontWeight: "600", color: C.mist },

  kosong: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  teksKosong: { fontSize: 14, color: C.snow, textAlign: "center" },

  kartu: {
    padding: 14,
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  panel: {
    height: 112,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bulatPanel: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245,247,255,0.1)",
  },
  kotakPanel: {
    position: "absolute",
    left: -16,
    bottom: -24,
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(245,247,255,0.1)",
    transform: [{ rotate: "12deg" }],
  },
  ubinPanel: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  barisLencana: { flexDirection: "row", alignItems: "center", gap: 10 },
  lencana: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  teksLencana: { fontSize: 12, fontWeight: "600" },
  info: { flexDirection: "row", alignItems: "center", gap: 5 },
  judulKartu: { fontSize: 17, fontWeight: "600", color: C.snow },
  barisInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  barisProgres: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  persen: { fontSize: 12, fontWeight: "600", color: C.snow },
  jalur: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(8,11,22,0.7)",
    overflow: "hidden",
  },
  isiJalur: { height: "100%", borderRadius: 999, overflow: "hidden" },

  kartuAktif: {
    padding: 18,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.aqua,
  },
  barisAktif: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelAktif: { fontSize: 14, fontWeight: "500", color: C.ink },
  streak: { marginTop: 14, fontSize: 38, fontWeight: "700", color: C.ink },
  streakSatuan: { fontSize: 18, fontWeight: "500", color: C.ink },
  tekGelap: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.ink },
  tekGelapKecil: { fontSize: 12, color: C.ink },
  heatmap: { flexDirection: "row", gap: 4, marginTop: 18 },
  kolom: { flex: 1, gap: 4 },
  sel: { aspectRatio: 1, borderRadius: 4 },
  selHariIni: { borderWidth: 2, borderColor: C.ink },
  kaki: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  legenda: { flexDirection: "row", alignItems: "center", gap: 4 },
  selLegenda: { width: 10, height: 10, borderRadius: 3 },
});