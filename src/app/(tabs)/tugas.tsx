import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  C,
  IkonPanah,
  TagTitik,
} from "../../components/dashboard/panel-kartu";
import { toast, WadahToast } from "../../components/toast";
import FormAI from "../../components/tugas/form-ai";
import FormTugas from "../../components/tugas/form-tugas";
import MenuTugas from "../../components/tugas/menu-tugas";
import {
  type MasukanTugas,
  type TugasItem,
  useDaftarTugas,
} from "../../lib/tugas";

type Tab = "aktif" | "terlambat" | "selesai" | "dibatalkan";

const BATAS_DAFTAR = 100;

const TAMPILAN: Record<
  Tab,
  {
    judul: string;
    kosong: string;
    ket: string;
    bg: string;
    teks: string;
    ketBg: string;
    ketTeks: string;
    garisIkon: string;
  }
> = {
  aktif: {
    judul: "Aktif",
    kosong: "Tidak ada tugas yang tenggatnya hari ini.",
    ket: "Tenggat hari ini",
    bg: C.brand,
    teks: C.snow,
    ketBg: "rgba(245,247,255,0.15)",
    ketTeks: C.snow,
    garisIkon: "rgba(245,247,255,0.4)",
  },
  terlambat: {
    judul: "Terlambat",
    kosong: "Tidak ada tugas yang terlambat.",
    ket: "Lewat tenggat",
    bg: C.lilac,
    teks: C.ink,
    ketBg: "rgba(8,11,22,0.1)",
    ketTeks: C.ink,
    garisIkon: "rgba(8,11,22,0.4)",
  },
  selesai: {
    judul: "Selesai",
    kosong: "Belum ada tugas yang selesai.",
    ket: "Sudah dikerjakan",
    bg: C.aqua,
    teks: C.ink,
    ketBg: "rgba(8,11,22,0.1)",
    ketTeks: C.ink,
    garisIkon: "rgba(8,11,22,0.4)",
  },
  dibatalkan: {
    judul: "Dibatalkan",
    kosong: "Tidak ada tugas yang dibatalkan.",
    ket: "Tidak dilanjutkan",
    bg: C.snow,
    teks: C.ink,
    ketBg: "rgba(8,11,22,0.1)",
    ketTeks: C.ink,
    garisIkon: "rgba(8,11,22,0.4)",
  },
};

const URUTAN_TAB: Tab[] = ["aktif", "terlambat", "selesai", "dibatalkan"];

const LABEL_PRIORITAS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};
const WARNA_PRIORITAS: Record<string, string> = {
  high: C.brand,
  medium: C.aqua,
  low: C.lilac,
};
const LABEL_STATUS: Record<string, string> = {
  todo: "Belum dikerjakan",
  in_progress: "Sedang dikerjakan",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// Tanggal murni ("2026-11-12") dipecah manual supaya tidak bergeser sehari
function formatTanggal(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function formatWaktu(tanggal: string | null, jam: string | null) {
  if (!tanggal) return null;
  return formatTanggal(tanggal) + (jam ? `, ${jam.slice(0, 5)}` : "");
}

/* ---------------- Kartu statistik ---------------- */

function KartuStat({
  tab,
  jumlah,
  terpilih,
  onPress,
}: {
  tab: Tab;
  jumlah: number;
  terpilih: boolean;
  onPress: () => void;
}) {
  const t = TAMPILAN[tab];
  const teks = terpilih ? t.teks : C.snow;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: terpilih }}
      style={[
        s.stat,
        terpilih
          ? { backgroundColor: t.bg, borderColor: "transparent" }
          : { backgroundColor: C.surface, borderColor: C.line },
      ]}
    >
      <View style={s.statAtas}>
        <Text style={[s.statLabel, { color: teks }]}>{t.judul}</Text>
        <View
          style={[
            s.statIkon,
            { borderColor: terpilih ? t.garisIkon : C.line },
          ]}
        >
          <IkonPanah warna={terpilih ? t.teks : C.mist} ukuran={12} />
        </View>
      </View>
      <View style={s.statBawah}>
        <Text style={[s.statAngka, { color: teks }]}>{jumlah}</Text>
        <View
          style={[
            s.statKet,
            { backgroundColor: terpilih ? t.ketBg : "rgba(8,11,22,0.6)" },
          ]}
        >
          <Text
            style={[s.statKetTeks, { color: terpilih ? t.ketTeks : C.mist }]}
            numberOfLines={1}
          >
            {t.ket}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------------- Baris tugas ---------------- */

function BarisTugas({
  t,
  onPress,
}: {
  t: TugasItem;
  onPress: () => void;
}) {
  const mulai = formatWaktu(t.start_date, t.start_time);
  const selesai = formatWaktu(t.due_date, t.due_time);
  const waktu =
    mulai && selesai
      ? `${mulai} sampai ${selesai}`
      : mulai
        ? `Mulai ${mulai}`
        : selesai
          ? `Selesai ${selesai}`
          : "Tanpa jadwal";
  const warna = WARNA_PRIORITAS[t.priority] ?? C.mist;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.baris, pressed && { opacity: 0.7 }]}
    >
      <View style={s.barisAtas}>
        <View style={[s.garisPrioritas, { backgroundColor: warna }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.judulBaris}>{t.title}</Text>
          <Text style={s.waktuBaris}>{waktu}</Text>
        </View>
      </View>
      <View style={s.tagBaris}>
        <TagTitik
          label={LABEL_PRIORITAS[t.priority] ?? t.priority}
          warna={warna}
        />
        <TagTitik
          label={LABEL_STATUS[t.status] ?? t.status}
          warna={C.mist}
        />
      </View>
    </Pressable>
  );
}

/* ---------------- Progres setengah lingkaran ---------------- */

const PANJANG_BUSUR = Math.PI * 88;
const BUSUR = "M 12 100 A 88 88 0 0 1 188 100";

function ProgresSetengah({ persen }: { persen: number }) {
  return (
    <View style={s.progresWadah}>
      <Svg viewBox="0 0 200 110" width="100%" height="100%">
        <Path
          d={BUSUR}
          fill="none"
          stroke={C.ink}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {persen > 0 ? (
          <Path
            d={BUSUR}
            fill="none"
            stroke={C.aqua}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={`${(PANJANG_BUSUR * persen) / 100} ${PANJANG_BUSUR}`}
          />
        ) : null}
      </Svg>
      <View style={s.progresTeks}>
        <Text style={s.progresAngka}>{persen}%</Text>
        <Text style={s.progresLabel}>Tugas selesai</Text>
      </View>
    </View>
  );
}

/* ---------------- Layar ---------------- */

export default function Tugas() {
  const router = useRouter();
  const {
    tugas,
    hariIni,
    memuat,
    menyegarkan,
    galat,
    muat,
    segarkan,
    ubahStatus,
    tambahTugas,
    hapusTugas,
    ubahTugas,
  } = useDaftarTugas();
  const [tab, setTab] = useState<Tab>("aktif");
  const [menuTugas, setMenuTugas] = useState<TugasItem | null>(null);
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [tugasEdit, setTugasEdit] = useState<TugasItem | null>(null);
  const [editTerbuka, setEditTerbuka] = useState(false);
  const [aiTerbuka, setAiTerbuka] = useState(false);

  // Muat ulang setiap kali tab Tugas dibuka
  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const d = useMemo(() => {
    const semua = tugas ?? [];
    const berjalan = semua.filter(
      (t) => t.status === "todo" || t.status === "in_progress"
    );
    // Sama seperti web: Aktif = tenggat hari ini, Terlambat = tenggat sebelum hari ini
    const aktif = berjalan.filter((t) => t.due_date === hariIni);
    const terlambat = berjalan.filter(
      (t) => t.due_date !== null && t.due_date < hariIni
    );
    const terbaru = (a: TugasItem, b: TugasItem) =>
      (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    const selesai = semua.filter((t) => t.status === "done").sort(terbaru);
    const dibatalkan = semua
      .filter((t) => t.status === "cancelled")
      .sort(terbaru);

    const sebaran = { high: 0, medium: 0, low: 0 };
    for (const t of berjalan) {
      if (t.priority in sebaran) sebaran[t.priority as keyof typeof sebaran]++;
    }

    // Daftar sudah terurut menurut tenggat, jadi yang pertama = tenggat terdekat
    const berikutnya =
      berjalan.find((t) => t.due_date !== null && t.due_date >= hariIni) ??
      null;

    return {
      daftar: { aktif, terlambat, selesai, dibatalkan } as Record<
        Tab,
        TugasItem[]
      >,
      semuaBerjalan: berjalan.length,
      lainnya: Math.max(berjalan.length - aktif.length - terlambat.length, 0),
      sebaran,
      berikutnya,
    };

      }, [tugas, hariIni]);

  const tampil = d.daftar[tab].slice(0, BATAS_DAFTAR);
  const totalProgres = d.daftar.selesai.length + d.semuaBerjalan;
  const persen =
    totalProgres > 0
      ? Math.round((d.daftar.selesai.length / totalProgres) * 100)
      : 0;
  const maks = Math.max(
    d.sebaran.high,
    d.sebaran.medium,
    d.sebaran.low,
    1
  );

  const ubahDenganToast = async (id: string, status: string) => {
    const hasil = await ubahStatus(id, status);
    if (hasil.ok) toast.sukses("Status tugas diperbarui");
    return hasil;
  };

  const tambahDenganToast = async (n: MasukanTugas) => {
    const hasil = await tambahTugas(n);
    if (hasil.ok) toast.sukses("Tugas berhasil ditambahkan");
    return hasil;
  };

  const simpanEditDenganToast = async (n: MasukanTugas) => {
    if (!tugasEdit) return { ok: false, pesan: "Tugas tidak ditemukan." };
    const hasil = await ubahTugas(tugasEdit.id, n);
    if (hasil.ok) toast.sukses("Tugas berhasil diperbarui");
    return hasil;
  };

  const hapusDenganToast = async (id: string) => {
    const hasil = await hapusTugas(id);
    if (hasil.ok) toast.sukses("Tugas berhasil dihapus");
    return hasil;
  };

  const bukaKalender = () => router.navigate("/kalender" as never);
  const tombolKalender = (
    <Pressable onPress={bukaKalender} style={s.tombolAqua}>
      <Text style={s.teksTombolAqua}>Lihat kalender</Text>
    </Pressable>
  );

  if (memuat && tugas === null) {
    return (
      <View style={[s.layar, s.tengah]}>
        <ActivityIndicator color={C.aqua} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={s.layar}
      contentContainerStyle={s.isi}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={segarkan}
          tintColor={C.aqua}
          colors={[C.aqua]}
          progressBackgroundColor={C.surface}
        />
      }
    >
      {/* Judul */}
      <View>
        <Text style={s.judul}>Tugas</Text>
        <Text style={s.sub}>
          Susun, urutkan, dan selesaikan tugasmu dengan tenang.
        </Text>
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Pressable onPress={() => setFormTerbuka(true)} style={s.tombolAqua}>
            <Text style={s.teksTombolAqua}>Tambah tugas</Text>
          </Pressable>
          <Pressable onPress={() => setAiTerbuka(true)} style={s.tombolGaris}>
            <Text style={s.teksTombolGaris}>Tambah dengan AI</Text>
          </Pressable>
        </View>
      </View>

      {/* Kartu statistik */}
      <View style={s.gridStat}>
        {URUTAN_TAB.map((k) => (
          <KartuStat
            key={k}
            tab={k}
            jumlah={d.daftar[k].length}
            terpilih={k === tab}
            onPress={() => setTab(k)}
          />
        ))}
      </View>

      {/* Daftar tugas */}
      <View style={s.kartu}>
        <Text style={s.judulKartu}>
          Tugas {TAMPILAN[tab].judul.toLowerCase()}
        </Text>

        {galat ? (
          <Text style={s.teksSnow}>
            Tugas gagal dimuat. Tarik layar ke bawah untuk mencoba lagi.
          </Text>
        ) : tampil.length === 0 ? (
          tab === "aktif" ? (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={s.teksSnow}>{TAMPILAN.aktif.kosong}</Text>
                <Text style={s.teksMist}>
                  {d.lainnya > 0
                    ? `Ada ${d.lainnya} tugas aktif lain yang tenggatnya setelah hari ini atau belum punya tenggat.`
                    : "Lihat jadwal dan acaramu di kalender."}
                </Text>
              </View>
              {tombolKalender}
            </View>
          ) : (
            <Text style={s.teksMist}>{TAMPILAN[tab].kosong}</Text>
          )
        ) : (
          <View style={{ gap: 8 }}>
            {tampil.map((t) => (
              <BarisTugas key={t.id} t={t} onPress={() => setMenuTugas(t)} />
            ))}
          </View>
        )}

        {tab === "aktif" && !galat && tampil.length > 0 && d.lainnya > 0 ? (
          <View style={s.kotakLainnya}>
            <Text style={s.teksMist}>
              Ada {d.lainnya} tugas aktif lain yang tenggatnya setelah hari ini
              atau belum punya tenggat.
            </Text>
            {tombolKalender}
          </View>
        ) : null}
      </View>

      {/* Tenggat berikutnya */}
      <View style={s.kartu}>
        <Text style={s.judulWidget}>Tenggat berikutnya</Text>
        {d.berikutnya ? (
          <>
            <Text style={s.tenggatJudul}>{d.berikutnya.title}</Text>
            <Text style={s.teksMistKecil}>
              {formatWaktu(d.berikutnya.due_date, d.berikutnya.due_time)}
            </Text>
            <Pressable
              onPress={bukaKalender}
              style={[s.tombolAqua, s.tombolPenuh]}
            >
              <Text style={s.teksTombolAqua}>Buka kalender</Text>
            </Pressable>
          </>
        ) : (
          <Text style={[s.teksMist, { marginTop: 12 }]}>
            Belum ada tenggat yang akan datang.
          </Text>
        )}
      </View>

      {/* Progres tugas */}
      <View style={s.kartu}>
        <Text style={s.judulWidget}>Progres tugas</Text>
        <View style={{ marginTop: 16 }}>
          <ProgresSetengah persen={persen} />
        </View>
        <View style={s.legenda}>
          <View style={s.itemLegenda}>
            <View style={[s.titikLegenda, { backgroundColor: C.aqua }]} />
            <Text style={s.teksLegenda}>
              Selesai {d.daftar.selesai.length}
            </Text>
          </View>
          <View style={s.itemLegenda}>
            <View
              style={[
                s.titikLegenda,
                {
                  backgroundColor: C.ink,
                  borderWidth: 1,
                  borderColor: C.line,
                },
              ]}
            />
            <Text style={s.teksLegenda}>Berjalan {d.semuaBerjalan}</Text>
          </View>
        </View>
      </View>

      {/* Sebaran prioritas */}
      <View style={s.kartu}>
        <Text style={s.judulWidget}>Prioritas tugas aktif</Text>
        <View style={s.batangWadah}>
          {(["high", "medium", "low"] as const).map((p) => (
            <View key={p} style={s.batangKolom}>
              <Text style={s.batangAngka}>{d.sebaran[p]}</Text>
              <View
                style={[
                  s.batang,
                  {
                    height: Math.max((d.sebaran[p] / maks) * 80, 8),
                    backgroundColor: WARNA_PRIORITAS[p],
                  },
                ]}
              />
              <Text style={s.batangLabel}>{LABEL_PRIORITAS[p]}</Text>
            </View>
          ))}
        </View>
      </View>
      <MenuTugas
        tugas={menuTugas}
        onTutup={() => setMenuTugas(null)}
        onUbah={ubahDenganToast}
        onHapus={hapusDenganToast}
        onEdit={(t) => {
          setMenuTugas(null);
          setTugasEdit(t);
          setEditTerbuka(true);
        }}
      />

      <FormTugas
        terbuka={formTerbuka}
        onTutup={() => setFormTerbuka(false)}
        onSimpan={tambahDenganToast}
      />

      <FormAI
        terbuka={aiTerbuka}
        onTutup={() => setAiTerbuka(false)}
        onTersimpan={muat}
      />
      {tugasEdit ? (
        <FormTugas
          key={tugasEdit.id}
          tugas={tugasEdit}
          terbuka={editTerbuka}
          onTutup={() => setEditTerbuka(false)}
          onSelesaiTutup={() => setTugasEdit(null)}
          onSimpan={simpanEditDenganToast}
        />
      ) : null}
    </ScrollView>
      <WadahToast />
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: C.ink },
  tengah: { alignItems: "center", justifyContent: "center" },
  isi: { padding: 20, paddingBottom: 32, gap: 20 },
  judul: { fontSize: 20, fontWeight: "600", color: C.snow },
  sub: { marginTop: 2, fontSize: 14, color: C.mist },

  gridStat: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  statAtas: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statLabel: { fontSize: 13, fontWeight: "500" },
  statIkon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statBawah: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  statAngka: { fontSize: 30, fontWeight: "600", lineHeight: 32 },
  statKet: {
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statKetTeks: { fontSize: 10, fontWeight: "500" },

  kartu: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 20,
  },
  judulKartu: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "600",
    color: C.snow,
  },
  judulWidget: { fontSize: 14, fontWeight: "500", color: C.mist },
  teksSnow: { fontSize: 14, color: C.snow },
  teksMist: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.mist },
  teksMistKecil: { marginTop: 4, fontSize: 14, color: C.mist },

  baris: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.baris,
  },
  barisAtas: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  garisPrioritas: { width: 4, height: 36, borderRadius: 2, marginTop: 4 },
  judulBaris: { fontSize: 14, fontWeight: "500", color: C.snow },
  waktuBaris: { marginTop: 4, fontSize: 12, color: C.mist },
  tagBaris: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  kotakLainnya: {
    marginTop: 16,
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },

  tombolAqua: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: C.aqua,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tombolPenuh: { alignSelf: "stretch", marginTop: 16, alignItems: "center" },
  teksTombolAqua: { fontSize: 14, fontWeight: "600", color: C.ink },
  tombolGaris: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  teksTombolGaris: { fontSize: 14, fontWeight: "600", color: C.snow },

  tenggatJudul: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    color: C.aqua,
  },

  progresWadah: {
    width: "100%",
    maxWidth: 224,
    aspectRatio: 200 / 110,
    alignSelf: "center",
  },
  progresTeks: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  progresAngka: { fontSize: 30, fontWeight: "600", color: C.snow },
  progresLabel: { fontSize: 12, color: C.mist },
  legenda: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: 6 },
  titikLegenda: { width: 8, height: 8, borderRadius: 4 },
  teksLegenda: { fontSize: 12, color: C.mist },

  batangWadah: {
    marginTop: 16,
    height: 128,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 12,
  },
  batangKolom: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  batangAngka: { fontSize: 12, fontWeight: "600", color: C.snow },
  batang: { width: "100%", maxWidth: 48, borderRadius: 999 },
  batangLabel: { fontSize: 11, color: C.mist },
});