import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, TagTitik } from "../../components/dashboard/panel-kartu";
import FormAcara from "../../components/kalender/form-acara";
import MenuAcara from "../../components/kalender/menu-acara";
import { toast, WadahToast } from "../../components/toast";
import FormAI from "../../components/tugas/form-ai";
import {
  useKalender,
  type Acara,
  type AcaraForm,
  type HasilAcara,
  type MasukanAcara,
  type Sesi,
  type TugasKal,
} from "../../lib/kalender";
import {
  akhirJam,
  bulanLain,
  formatMenit,
  jamLokal,
  keMenit,
  NAMA_BULAN,
  NAMA_HARI_PENUH,
  NAMA_HARI_SINGKAT,
  pad,
  tambahHari,
  tglLokal,
  tglPendek,
} from "../../lib/kalender-waktu";

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

type LabelTugas = "Aktif" | "Terlambat" | "Selesai" | "Dibatalkan";
const WARNA_TUGAS: Record<LabelTugas, string> = {
  Aktif: C.brand,
  Terlambat: C.lilac,
  Selesai: C.aqua,
  Dibatalkan: C.mist,
};

type LabelSesi = "Selesai" | "Berjalan" | "Dijeda" | "Terlewat" | "Terjadwal";
const WARNA_SESI: Record<LabelSesi, string> = {
  Selesai: C.aqua,
  Berjalan: C.lilac,
  Dijeda: C.lilac,
  Terlewat: C.mist,
  Terjadwal: C.brand,
};

// Terlambat = masih aktif tapi tanggal selesainya sudah lewat (sama dengan halaman Tugas)
function labelTugas(t: TugasKal, hariIni: string): LabelTugas {
  if (t.status === "done") return "Selesai";
  if (t.status === "cancelled") return "Dibatalkan";
  if (t.due_date && t.due_date < hariIni) return "Terlambat";
  return "Aktif";
}

// Terlewat: sesi belum dimulai dan waktunya sudah lewat
function labelSesi(s: Sesi, hariIni: string, sekarangMenit: number): LabelSesi {
  if (s.status === "done") return "Selesai";
  if (s.status === "running") return "Berjalan";
  if (s.elapsed_seconds > 0) return "Dijeda";
  if (s.session_date < hariIni) return "Terlewat";
  if (
    s.session_date === hariIni &&
    s.start_time &&
    s.planned_minutes &&
    keMenit(s.start_time) + s.planned_minutes < sekarangMenit
  ) {
    return "Terlewat";
  }
  return "Terjadwal";
}

function statusAcara(
  a: Acara,
  sekarang: number
): "Selesai" | "Berlangsung" | "Terlewat" | null {
  if (a.status === "completed") return "Selesai";
  if (new Date(a.end_at).getTime() <= sekarang) return "Terlewat";
  if (new Date(a.start_at).getTime() <= sekarang) return "Berlangsung";
  return null;
}

function waktuAcara(a: Acara, tz: string) {
  if (a.all_day) return "Sepanjang hari";
  const mulai = new Date(a.start_at);
  const selesai = new Date(a.end_at);
  const tglMulai = tglLokal(mulai, tz);
  const tglSelesai = tglLokal(selesai, tz);
  if (tglMulai === tglSelesai) {
    return `${jamLokal(mulai, tz)} – ${jamLokal(selesai, tz)}`;
  }
  return `${tglPendek(tglMulai)} ${jamLokal(mulai, tz)} – ${tglPendek(tglSelesai)} ${jamLokal(selesai, tz)}`;
}

function waktuTugas(t: TugasKal) {
  const a = t.start_date
    ? `${tglPendek(t.start_date)}${t.start_time ? ` ${t.start_time.slice(0, 5)}` : ""}`
    : null;
  const b = t.due_date
    ? `${tglPendek(t.due_date)}${t.due_time ? ` ${t.due_time.slice(0, 5)}` : ""}`
    : null;
  if (a && b) return `${a} – ${b}`;
  if (b) return `Tenggat ${b}`;
  if (a) return `Mulai ${a}`;
  return "";
}

// Mengubah acara dari database menjadi nilai awal form edit (waktu lokal)
function keFormAcara(a: Acara, tz: string): AcaraForm {
  const mulai = new Date(a.start_at);
  const selesai = new Date(a.end_at);
  const tglMulai = tglLokal(mulai, tz);
  let tglSelesai = tglLokal(selesai, tz);
  if (a.all_day) {
    // Acara sepanjang hari berakhir tepat 00:00 hari berikutnya
    tglSelesai = tambahHari(tglSelesai, -1);
    if (tglSelesai < tglMulai) tglSelesai = tglMulai;
  }
  return {
    id: a.id,
    title: a.title,
    location: a.location ?? "",
    sepanjangHari: a.all_day,
    mulaiTanggal: tglMulai,
    mulaiJam: a.all_day ? "" : jamLokal(mulai, tz),
    selesaiTanggal: tglSelesai,
    selesaiJam: a.all_day ? "" : jamLokal(selesai, tz),
  };
}

/* ---------------- Komponen kecil ---------------- */

function IkonChevron({
  kiri = false,
  warna = C.snow,
}: {
  kiri?: boolean;
  warna?: string;
}) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={kiri ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </Svg>
  );
}

// Bulat = acara, kotak = tugas, belah ketupat = belajar
function Penanda({
  jenis,
  terang = false,
}: {
  jenis: "acara" | "tugas" | "belajar";
  terang?: boolean;
}) {
  if (jenis === "acara") {
    return (
      <View
        style={[
          s.penanda,
          { borderRadius: 4, backgroundColor: terang ? C.snow : C.aqua },
        ]}
      />
    );
  }
  if (jenis === "tugas") {
    return (
      <View
        style={[
          s.penanda,
          {
            borderRadius: 3,
            backgroundColor: terang ? "rgba(245,247,255,0.6)" : C.lilac,
          },
        ]}
      />
    );
  }
  return (
    <View
      style={[
        s.penanda,
        {
          borderRadius: 2,
          transform: [{ rotate: "45deg" }],
          backgroundColor: terang ? "rgba(245,247,255,0.8)" : C.brand,
        },
      ]}
    />
  );
}

function KartuRingkas({
  label,
  nilai,
  keterangan,
  latar,
  teks,
  bergaris,
  penuh,
  onPress,
  children,
}: {
  label: string;
  nilai: number;
  keterangan: string;
  latar: string;
  teks: string;
  bergaris?: boolean;
  penuh?: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.tile,
        penuh ? s.tilePenuh : s.tileSetengah,
        { backgroundColor: latar },
        bergaris && { borderWidth: 1, borderColor: C.line },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View>
        <Text style={[s.tileAngka, { color: teks }]}>{nilai}</Text>
        <Text style={[s.tileKet, { color: teks }]}>{keterangan}</Text>
      </View>
      <View>
        {children}
        <View style={s.tileBawah}>
          <Text style={[s.tileLabel, { color: teks }]}>{label}</Text>
          <IkonChevron warna={teks} />
        </View>
      </View>
    </Pressable>
  );
}

function SelHari({
  nomor,
  aktif,
  hariIniIni,
  nAcara,
  nTugas,
  nSesi,
  onPress,
}: {
  nomor: number;
  aktif: boolean;
  hariIniIni: boolean;
  nAcara: number;
  nTugas: number;
  nSesi: number;
  onPress: () => void;
}) {
  const warnaNomor = hariIniIni
    ? aktif
      ? C.brand
      : C.ink
    : aktif
      ? C.snow
      : C.mist;
  return (
    <View style={s.selLuar}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: aktif }}
        accessibilityLabel={`${nomor}: ${nAcara} acara, ${nTugas} tugas, ${nSesi} sesi belajar`}
        style={[s.sel, aktif ? s.selAktif : s.selBiasa]}
      >
        <View
          style={[
            s.nomor,
            hariIniIni && { backgroundColor: aktif ? C.snow : C.lilac },
          ]}
        >
          <Text
            style={[
              s.teksNomor,
              { color: warnaNomor },
              (aktif || hariIniIni) && { fontWeight: "600" },
            ]}
          >
            {nomor}
          </Text>
        </View>
        <View style={s.penandaBaris}>
          {nAcara > 0 ? <Penanda jenis="acara" terang={aktif} /> : null}
          {nTugas > 0 ? <Penanda jenis="tugas" terang={aktif} /> : null}
          {nSesi > 0 ? <Penanda jenis="belajar" terang={aktif} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

function JudulBagian({
  jenis,
  label,
  jumlah,
}: {
  jenis: "acara" | "tugas" | "belajar";
  label: string;
  jumlah: number;
}) {
  return (
    <View style={s.judulBagian}>
      <Penanda jenis={jenis} />
      <Text style={s.teksJudulBagian}>
        {label} <Text style={{ color: C.snow }}>({jumlah})</Text>
      </Text>
    </View>
  );
}

function BarisAgenda({
  warna,
  judul,
  tercoret,
  info,
  tag,
  onPress,
}: {
  warna: string;
  judul: string;
  tercoret?: boolean;
  info: string[];
  tag: { label: string; warna: string }[];
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        s.baris,
        tercoret && { opacity: 0.75 },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={s.barisAtas}>
        <View style={[s.garis, { backgroundColor: warna }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.judulBaris, tercoret && s.tercoret]}>{judul}</Text>
          {info.map((i, n) => (
            <Text key={n} style={s.infoBaris}>
              {i}
            </Text>
          ))}
        </View>
      </View>
      {tag.length > 0 ? (
        <View style={s.tagBaris}>
          {tag.map((t) => (
            <TagTitik key={t.label} label={t.label} warna={t.warna} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/* ---------------- Layar ---------------- */

export default function Kalender() {
  const router = useRouter();
  const {
    tz,
    hariIni,
    data,
    memuat,
    menyegarkan,
    galat,
    muat,
    segarkan,
    tambahAcara,
    ubahStatusAcara,
    ubahAcara,
    hapusAcara,
  } = useKalender();
  // null = bulan ini / hari ini
  const [bulanPilih, setBulanPilih] = useState<string | null>(null);
  const [tanggalPilih, setTanggalPilih] = useState<string | null>(null);
  const [aiTerbuka, setAiTerbuka] = useState(false);
  const [acaraTerbuka, setAcaraTerbuka] = useState(false);
  const [acaraMenu, setAcaraMenu] = useState<Acara | null>(null);
  const [acaraEdit, setAcaraEdit] = useState<AcaraForm | null>(null);
  const [editTerbuka, setEditTerbuka] = useState(false);
  const gulirRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [yKalender, setYKalender] = useState(0);

  // Muat saat tab dibuka dan setiap kali bulan berganti
  useFocusEffect(
    useCallback(() => {
      muat(bulanPilih);
    }, [muat, bulanPilih])
  );

  const kodeBulan = bulanPilih ?? (hariIni ? hariIni.slice(0, 7) : "");

  const g = useMemo(() => {
    if (!kodeBulan) return null;
    const tahun = Number(kodeBulan.slice(0, 4));
    const bulan = Number(kodeBulan.slice(5, 7));
    const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
    const hariPertama = new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay();
    const kosongAwal = (hariPertama + 6) % 7; // minggu dimulai Senin
    const sel: (string | null)[] = [
      ...Array<null>(kosongAwal).fill(null),
      ...Array.from(
        { length: jumlahHari },
        (_, i) => `${kodeBulan}-${pad(i + 1)}`
      ),
    ];
    while (sel.length % 7 !== 0) sel.push(null);
    return { tahun, bulan, jumlahHari, sel };
  }, [kodeBulan]);

  if (memuat && data === null) {
    return (
      <View style={[s.layar, s.tengah]}>
        <ActivityIndicator color={C.aqua} />
      </View>
    );
  }

  if (!g) {
    return (
      <View style={[s.layar, s.tengah, { padding: 20 }]}>
        <Text style={s.teksSnow}>
          Kalender gagal dimuat. Buka ulang tab ini untuk mencoba lagi.
        </Text>
      </View>
    );
  }

  // Data hanya dipakai kalau memang untuk bulan yang sedang ditampilkan
  const d = data !== null && data.kodeBulan === kodeBulan ? data : null;

  const dipilih =
    tanggalPilih && tanggalPilih.startsWith(`${kodeBulan}-`)
      ? tanggalPilih
      : hariIni.startsWith(`${kodeBulan}-`)
        ? hariIni
        : `${kodeBulan}-01`;

  const sekarang = Date.now();
  const sekarangMenit = keMenit(jamLokal(new Date(sekarang), tz));

  const acaraDipilih = d?.acaraPerHari.get(dipilih) ?? [];
  const tugasDipilih = d?.tugasPerHari.get(dipilih) ?? [];
  const sesiDipilih = d?.sesiPerHari.get(dipilih) ?? [];
  const jumlahDipilih =
    acaraDipilih.length + tugasDipilih.length + sesiDipilih.length;

  const namaHari =
    NAMA_HARI_PENUH[new Date(`${dipilih}T00:00:00Z`).getUTCDay()];
  const judulDipilih = `${namaHari}, ${Number(dipilih.slice(8, 10))} ${NAMA_BULAN[g.bulan - 1]} ${g.tahun}`;

  // Ringkasan bulan ini
  const totalAcara = d
    ? new Set([...d.acaraPerHari.values()].flat().map((a) => a.id)).size
    : 0;
  const totalTugas = d
    ? new Set(
        [...d.tugasPerHari.values()]
          .flat()
          .filter((t) => t.status === "todo" || t.status === "in_progress")
          .map((t) => t.id)
      ).size
    : 0;
  const totalSesi = d
    ? [...d.sesiPerHari.values()].reduce((n, daftar) => n + daftar.length, 0)
    : 0;
  const hariTerisi = d
    ? g.sel.filter(
        (t) =>
          t &&
          (d.acaraPerHari.has(t) ||
            d.tugasPerHari.has(t) ||
            d.sesiPerHari.has(t))
      ).length
    : 0;
  const persenTerisi = Math.round((hariTerisi / g.jumlahHari) * 100);

  const judulBanner =
    totalAcara + totalTugas + totalSesi === 0
      ? `${NAMA_BULAN[g.bulan - 1]} masih kosong`
      : `${totalAcara} acara, ${totalTugas} tugas, dan ${totalSesi} sesi belajar di bulan ${NAMA_BULAN[g.bulan - 1]}`;

  // Batang kecil di sekitar angka besar: kepadatan 3 hari sebelum dan sesudah hari terpilih
  const tetangga = [-3, -2, -1, 1, 2, 3].map((k) => {
    const hari = tambahHari(dipilih, k);
    const n =
      (d?.acaraPerHari.get(hari)?.length ?? 0) +
      (d?.tugasPerHari.get(hari)?.length ?? 0) +
      (d?.sesiPerHari.get(hari)?.length ?? 0);
    return { k, n };
  });
  const Batang = ({ n }: { n: number }) => (
    <View
      style={{
        width: 4,
        height: 10 + Math.min(n, 6) * 6,
        borderRadius: 2,
        backgroundColor: n > 0 ? "rgba(245,247,255,0.7)" : C.line,
      }}
    />
  );

  const pindahBulan = (selisih: number) => {
    setTanggalPilih(null);
    setBulanPilih(bulanLain(g.tahun, g.bulan, selisih));
  };
  const keHariIni = () => {
    setTanggalPilih(null);
    setBulanPilih(null);
  };
  const keKalender = () =>
    gulirRef.current?.scrollTo({
      y: Math.max(yKalender - 12, 0),
      animated: true,
    });

  const simpanAcara = async (n: MasukanAcara) => {
    const hasil = await tambahAcara(n, bulanPilih);
    if (hasil.ok) toast.sukses("Acara berhasil ditambahkan");
    return hasil;
  };

  const ubahStatus = async (
    id: string,
    status: "active" | "completed"
  ): Promise<HasilAcara> => {
    const hasil = await ubahStatusAcara(id, status, bulanPilih);
    if (hasil.ok) {
      toast.sukses(
        status === "completed" ? "Acara ditandai selesai" : "Acara dibuka kembali"
      );
    }
    return hasil;
  };

  const hapus = async (id: string): Promise<HasilAcara> => {
    const hasil = await hapusAcara(id, bulanPilih);
    if (hasil.ok) toast.sukses("Acara berhasil dihapus");
    return hasil;
  };

  const simpanEdit = async (n: MasukanAcara): Promise<HasilAcara> => {
    if (!acaraEdit) return { ok: false, pesan: "Acara tidak ditemukan." };
    const hasil = await ubahAcara(acaraEdit.id, n, bulanPilih);
    if (hasil.ok) toast.sukses("Acara berhasil diperbarui");
    return hasil;
  };

  const bukaEdit = (a: Acara) => {
    setAcaraMenu(null);
    setAcaraEdit(keFormAcara(a, tz));
    setEditTerbuka(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={gulirRef}
        style={s.layar}
        contentContainerStyle={s.isi}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={menyegarkan}
            onRefresh={() => segarkan(bulanPilih)}
            tintColor={C.aqua}
            colors={[C.aqua]}
            progressBackgroundColor={C.surface}
          />
        }
      >
        {galat ? (
          <Text accessibilityRole="alert" style={s.galat}>
            Sebagian data kalender gagal dimuat. Tarik layar ke bawah untuk
            mencoba lagi.
          </Text>
        ) : null}

        {/* 1. Banner */}
        <View style={s.banner}>
          <Text style={s.bannerLabel}>Kalender</Text>
          <Text style={s.bannerJudul}>{judulBanner}</Text>
          <Text style={s.bannerDeskripsi}>
            Acara, tugas, dan sesi belajar kamu dalam satu tampilan bulan,
            termasuk yang sudah selesai, terlewat, atau dibatalkan.
          </Text>
          <View style={s.bannerTombol}>
            <Pressable
              onPress={() => setAcaraTerbuka(true)}
              style={s.tombolAqua}
            >
              <Text style={s.teksTombolAqua}>Tambah acara</Text>
            </Pressable>
            <Pressable onPress={() => setAiTerbuka(true)} style={s.tombolGaris}>
              <Text style={s.teksTombolGaris}>Tambah dengan AI</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Kartu ringkasan */}
        <View style={s.gridTile}>
          <KartuRingkas
            label="Acara"
            nilai={totalAcara}
            keterangan={`${NAMA_BULAN[g.bulan - 1]} ${g.tahun}`}
            latar={C.brand}
            teks={C.snow}
            onPress={keKalender}
          />
          <KartuRingkas
            label="Tugas aktif"
            nilai={totalTugas}
            keterangan="Bulan ini"
            latar={C.lilac}
            teks={C.ink}
            onPress={() => router.navigate("/tugas" as never)}
          />
          <KartuRingkas
            penuh
            bergaris
            label="Hari terisi"
            nilai={hariTerisi}
            keterangan={`dari ${g.jumlahHari} hari`}
            latar={C.surface}
            teks={C.snow}
            onPress={keKalender}
          >
            <View style={s.progresLatar}>
              <View
                style={[s.progresIsi, { width: `${persenTerisi}%` }]}
              />
            </View>
          </KartuRingkas>
        </View>

        {/* 3. Kalender bulan */}
        <View
          style={s.kartu}
          onLayout={(e) => setYKalender(e.nativeEvent.layout.y)}
        >
          <View style={s.kepalaBulan}>
            <View style={s.judulBulanWadah}>
              <Text style={s.judulBulan}>
                {NAMA_BULAN[g.bulan - 1]} {g.tahun}
              </Text>
              {d === null ? (
                <ActivityIndicator size="small" color={C.aqua} />
              ) : null}
            </View>
            <View style={s.navBulan}>
              <Pressable
                onPress={() => pindahBulan(-1)}
                accessibilityRole="button"
                accessibilityLabel="Bulan sebelumnya"
                style={s.tombolIkon}
              >
                <IkonChevron kiri />
              </Pressable>
              <Pressable
                onPress={keHariIni}
                accessibilityRole="button"
                style={s.tombolHariIni}
              >
                <Text style={s.teksHariIni}>Hari ini</Text>
              </Pressable>
              <Pressable
                onPress={() => pindahBulan(1)}
                accessibilityRole="button"
                accessibilityLabel="Bulan berikutnya"
                style={s.tombolIkon}
              >
                <IkonChevron />
              </Pressable>
            </View>
          </View>

          <View style={s.barisHari}>
            {NAMA_HARI_SINGKAT.map((h) => (
              <View key={h} style={s.selLuar}>
                <Text style={s.namaHari}>{h}</Text>
              </View>
            ))}
          </View>

          <View style={s.grid}>
            {g.sel.map((tgl, i) => {
              if (!tgl) return <View key={`kosong-${i}`} style={s.selLuar} />;
              return (
                <SelHari
                  key={tgl}
                  nomor={Number(tgl.slice(8, 10))}
                  aktif={tgl === dipilih}
                  hariIniIni={tgl === hariIni}
                  nAcara={d?.acaraPerHari.get(tgl)?.length ?? 0}
                  nTugas={d?.tugasPerHari.get(tgl)?.length ?? 0}
                  nSesi={d?.sesiPerHari.get(tgl)?.length ?? 0}
                  onPress={() => setTanggalPilih(tgl)}
                />
              );
            })}
          </View>

          <View style={s.legenda}>
            <View style={s.itemLegenda}>
              <Penanda jenis="acara" />
              <Text style={s.teksLegenda}>Ada acara</Text>
            </View>
            <View style={s.itemLegenda}>
              <Penanda jenis="tugas" />
              <Text style={s.teksLegenda}>Ada tugas</Text>
            </View>
            <View style={s.itemLegenda}>
              <Penanda jenis="belajar" />
              <Text style={s.teksLegenda}>Ada sesi belajar</Text>
            </View>
          </View>
        </View>

        {/* 4. Angka besar + agenda */}
        <View style={s.aside}>
          <View style={s.angkaWadah}>
            <View style={s.angkaBaris}>
              <View style={s.batangWadah}>
                {tetangga
                  .filter((b) => b.k < 0)
                  .map((b) => (
                    <Batang key={b.k} n={b.n} />
                  ))}
              </View>
              <Text style={s.angkaBesar}>{jumlahDipilih}</Text>
              <View style={s.batangWadah}>
                {tetangga
                  .filter((b) => b.k > 0)
                  .map((b) => (
                    <Batang key={b.k} n={b.n} />
                  ))}
              </View>
            </View>
            <Text style={s.angkaKet}>
              {acaraDipilih.length} acara, {tugasDipilih.length} tugas, dan{" "}
              {sesiDipilih.length} sesi belajar pada tanggal terpilih
            </Text>
          </View>

          <View style={s.panelAgenda}>
            <Text style={s.judulAgenda}>{judulDipilih}</Text>

            {d !== null && jumlahDipilih === 0 ? (
              <Text style={s.teksMist}>
                Tidak ada acara, tugas, atau sesi belajar pada tanggal ini.
              </Text>
            ) : null}

            {acaraDipilih.length > 0 ? (
              <View style={s.bagian}>
                <JudulBagian
                  jenis="acara"
                  label="Acara"
                  jumlah={acaraDipilih.length}
                />
                <View style={{ gap: 8 }}>
                  {acaraDipilih.map((a) => {
                    const status = statusAcara(a, sekarang);
                    return (
                      <BarisAgenda
                        key={a.id}
                        warna={C.snow}
                        judul={a.title}
                        tercoret={status === "Selesai"}
                        info={[
                          waktuAcara(a, tz),
                          ...(a.location ? [a.location] : []),
                        ]}
                        tag={status ? [{ label: status, warna: C.mist }] : []}
                        onPress={() => setAcaraMenu(a)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {tugasDipilih.length > 0 ? (
              <View style={s.bagian}>
                <JudulBagian
                  jenis="tugas"
                  label="Tugas"
                  jumlah={tugasDipilih.length}
                />
                <View style={{ gap: 8 }}>
                  {tugasDipilih.map((t) => {
                    const label = labelTugas(t, hariIni);
                    const waktu = waktuTugas(t);
                    const warnaPrioritas =
                      WARNA_PRIORITAS[t.priority] ?? C.mist;
                    return (
                      <BarisAgenda
                        key={t.id}
                        warna={warnaPrioritas}
                        judul={t.title}
                        tercoret={
                          label === "Selesai" || label === "Dibatalkan"
                        }
                        info={waktu ? [waktu] : []}
                        tag={[
                          { label, warna: WARNA_TUGAS[label] },
                          {
                            label: LABEL_PRIORITAS[t.priority] ?? t.priority,
                            warna: warnaPrioritas,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {sesiDipilih.length > 0 ? (
              <View style={s.bagian}>
                <JudulBagian
                  jenis="belajar"
                  label="Belajar"
                  jumlah={sesiDipilih.length}
                />
                <View style={{ gap: 8 }}>
                  {sesiDipilih.map((se) => {
                    const label = labelSesi(se, hariIni, sekarangMenit);
                    const selesai = label === "Selesai";
                    const menit = selesai
                      ? se.actual_minutes
                      : se.planned_minutes;
                    const jam = se.start_time
                      ? se.start_time.slice(0, 5)
                      : null;
                    const waktu = jam
                      ? menit
                        ? `${jam} – ${akhirJam(jam, menit)}`
                        : jam
                      : "Tanpa jam";
                    const namaTopik = se.topic_id
                      ? d?.judulTopik.get(se.topic_id)
                      : undefined;
                    const namaTujuan = d?.judulTujuan.get(se.goal_id);
                    return (
                      <BarisAgenda
                        key={se.id}
                        warna={C.brand}
                        judul={namaTopik ?? "Sesi tanpa topik"}
                        tercoret={selesai}
                        info={[
                          `${waktu}${menit ? ` · ${formatMenit(menit)}` : ""}`,
                          ...(namaTujuan ? [namaTujuan] : []),
                        ]}
                        tag={[{ label, warna: WARNA_SESI[label] }]}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => router.navigate("/tugas" as never)}
              style={s.tombolSnow}
            >
              <Text style={s.teksTombolSnow}>Kelola tugas</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <WadahToast />

      <FormAcara
        terbuka={acaraTerbuka}
        onTutup={() => setAcaraTerbuka(false)}
        onSimpan={simpanAcara}
        tz={tz}
        tanggalAwal={dipilih}
      />

      <FormAcara
        terbuka={editTerbuka}
        onTutup={() => setEditTerbuka(false)}
        onSelesaiTutup={() => setAcaraEdit(null)}
        onSimpan={simpanEdit}
        tz={tz}
        acara={acaraEdit ?? undefined}
      />

      <MenuAcara
        acara={acaraMenu}
        waktu={acaraMenu ? waktuAcara(acaraMenu, tz) : ""}
        onTutup={() => setAcaraMenu(null)}
        onUbahStatus={ubahStatus}
        onHapus={hapus}
        onEdit={bukaEdit}
      />

      <FormAI
        terbuka={aiTerbuka}
        onTutup={() => setAiTerbuka(false)}
        onTersimpan={() => muat(bulanPilih)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: C.ink },
  tengah: { alignItems: "center", justifyContent: "center" },
  isi: { padding: 20, paddingBottom: 32, gap: 20 },
  teksSnow: { fontSize: 14, color: C.snow },
  teksMist: { fontSize: 14, lineHeight: 20, color: C.mist },
  galat: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 13,
    lineHeight: 18,
    color: C.snow,
  },

  /* Banner */
  banner: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 24,
  },
  bannerLabel: { fontSize: 14, color: C.mist },
  bannerJudul: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
    color: C.snow,
  },
  bannerDeskripsi: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: C.mist,
  },
  bannerTombol: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tombolGaris: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  teksTombolGaris: { fontSize: 14, fontWeight: "600", color: C.snow },
  tombolAqua: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: C.aqua,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  teksTombolAqua: { fontSize: 14, fontWeight: "600", color: C.ink },

  /* Kartu ringkasan */
  gridTile: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    minHeight: 144,
    borderRadius: 24,
    padding: 20,
    justifyContent: "space-between",
  },
  tileSetengah: { flexBasis: "47%", flexGrow: 1 },
  tilePenuh: { width: "100%" },
  tileAngka: { fontSize: 36, fontWeight: "600", lineHeight: 38 },
  tileKet: { marginTop: 6, fontSize: 12, opacity: 0.8 },
  tileBawah: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tileLabel: { fontSize: 18, fontWeight: "500" },
  progresLatar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  progresIsi: { height: "100%", borderRadius: 3, backgroundColor: C.aqua },

  /* Kalender bulan */
  kartu: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 16,
  },
  kepalaBulan: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  judulBulanWadah: { flexDirection: "row", alignItems: "center", gap: 8 },
  judulBulan: { fontSize: 18, fontWeight: "600", color: C.snow },
  navBulan: { flexDirection: "row", alignItems: "center", gap: 8 },
  tombolIkon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolHariIni: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  teksHariIni: { fontSize: 13, fontWeight: "500", color: C.snow },

  barisHari: { marginTop: 16, flexDirection: "row" },
  namaHari: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: C.mist,
  },
  grid: { marginTop: 4, flexDirection: "row", flexWrap: "wrap" },
  selLuar: { width: "14.2857%", padding: 2 },
  sel: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  selBiasa: {
    backgroundColor: "rgba(8,11,22,0.5)",
    borderColor: "transparent",
  },
  selAktif: { backgroundColor: C.brand, borderColor: C.brand },
  nomor: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  teksNomor: { fontSize: 13 },
  penandaBaris: {
    height: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  penanda: { width: 7, height: 7 },

  legenda: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: 6 },
  teksLegenda: { fontSize: 12, color: C.mist },

  /* Angka besar + agenda */
  aside: {
    gap: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    padding: 16,
  },
  angkaWadah: { alignItems: "center", paddingTop: 8 },
  angkaBaris: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 20,
  },
  batangWadah: {
    height: 56,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  angkaBesar: {
    fontSize: 72,
    fontWeight: "600",
    lineHeight: 72,
    color: C.snow,
  },
  angkaKet: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    color: C.mist,
  },

  panelAgenda: {
    gap: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.ink,
    padding: 20,
  },
  judulAgenda: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28,
    color: C.snow,
  },
  bagian: { marginTop: 16, gap: 10 },
  judulBagian: { flexDirection: "row", alignItems: "center", gap: 8 },
  teksJudulBagian: { fontSize: 14, fontWeight: "500", color: C.mist },

  baris: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  barisAtas: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  garis: { width: 4, height: 36, borderRadius: 2, marginTop: 4 },
  judulBaris: { fontSize: 14, fontWeight: "500", color: C.snow },
  tercoret: {
    textDecorationLine: "line-through",
    textDecorationColor: C.mist,
  },
  infoBaris: { marginTop: 4, fontSize: 12, color: C.mist },
  tagBaris: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tombolSnow: {
    alignSelf: "flex-start",
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: C.snow,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  teksTombolSnow: { fontSize: 14, fontWeight: "600", color: C.ink },
});