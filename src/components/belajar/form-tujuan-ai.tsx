import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { aktifkanAI } from "../../lib/ai-tugas";
import {
  simpanTujuanAI,
  simpanTujuanJadwalAI,
  susunJadwalAI,
  susunTujuanAI,
} from "../../lib/belajar-ai";
import {
  JADWAL_AWAL,
  bangunTopik,
  periksaPengaturan,
  sesiKeEd,
  tglId,
  topikKeEd,
  type PengaturanJadwalEd,
  type SesiEd,
  type SubEd,
  type TopikEd,
} from "../../lib/belajar-ai-ed";
import { C } from "../dashboard/panel-kartu";
import { toast } from "../toast";
import { LembarBawah } from "../tugas/lembar-bawah";
import { Centang, EditorTopik, kolom } from "./editor-topik";

const MAKS = 500;

const KOSONG = {
  judul: "",
  target: "",
  tanggal: "",
  level: "pemula",
  menit: "",
  kriteria: "",
};

const LEVEL: { nilai: string; label: string }[] = [
  { nilai: "pemula", label: "Pemula" },
  { nilai: "menengah", label: "Menengah" },
  { nilai: "mahir", label: "Mahir" },
];

type InfoJadwal = {
  awal: string;
  akhir: string;
  durasi: number;
  maksHari: number;
  belum: { nama: string; menit: number }[];
};

/* ====== Bagian kecil ====== */

function Tombol({
  label,
  utama,
  nonaktif,
  onPress,
}: {
  label: string;
  utama?: boolean;
  nonaktif?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={nonaktif}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.tombol,
        utama ? s.tombolUtama : s.tombolGaris,
        nonaktif && { opacity: 0.6 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text
        style={[s.teksTombol, { color: utama ? C.ink : C.snow }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Isian({
  label,
  nilai,
  onUbah,
  nonaktif,
  multiline,
  maks,
  tipe,
  placeholder,
}: {
  label: string;
  nilai: string;
  onUbah: (v: string) => void;
  nonaktif?: boolean;
  multiline?: boolean;
  maks?: number;
  tipe?: "teks" | "angka" | "jam";
  placeholder?: string;
}) {
  return (
    <View>
      <Text style={s.labelKecil}>{label}</Text>
      <TextInput
        value={nilai}
        onChangeText={onUbah}
        editable={!nonaktif}
        maxLength={maks}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={
          tipe === "angka"
            ? "number-pad"
            : tipe === "jam"
              ? "numbers-and-punctuation"
              : "default"
        }
        placeholder={placeholder}
        placeholderTextColor={C.mist}
        style={[
          kolom,
          { marginTop: 4 },
          multiline && { minHeight: 72 },
          nonaktif && { opacity: 0.6 },
        ]}
      />
    </View>
  );
}

function PengaturanJadwal({
  nilai,
  onUbah,
  nonaktif,
}: {
  nilai: PengaturanJadwalEd;
  onUbah: (p: Partial<PengaturanJadwalEd>) => void;
  nonaktif: boolean;
}) {
  return (
    <View style={s.kotakJadwal}>
      <Text style={s.judulKecil}>Jadwal belajar</Text>
      <Pressable
        onPress={() => !nonaktif && onUbah({ sekalian: !nilai.sekalian })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: nilai.sekalian, disabled: nonaktif }}
        style={s.barisCentang}
      >
        <Centang
          nilai={nilai.sekalian}
          nonaktif={nonaktif}
          onUbah={(v) => onUbah({ sekalian: v })}
          label="Susun jadwal sesi belajar sekalian"
        />
        <Text style={s.teksCentang}>Susun jadwal sesi belajar sekalian</Text>
      </Pressable>

      {nilai.sekalian ? (
        <View style={{ gap: 10 }}>
          <Text style={s.ket}>
            Jadwal tidak bertabrakan dengan acara, tugas, atau sesi belajar
            lain. Kamu bisa memeriksa dan mengubahnya sebelum disimpan.
          </Text>
          <Isian
            label="Jam belajar dari (JJ:MM)"
            nilai={nilai.jamMulai}
            onUbah={(v) => onUbah({ jamMulai: v })}
            nonaktif={nonaktif}
            tipe="jam"
            maks={5}
            placeholder="19:00"
          />
          <Isian
            label="Sampai jam (JJ:MM)"
            nilai={nilai.jamSelesai}
            onUbah={(v) => onUbah({ jamSelesai: v })}
            nonaktif={nonaktif}
            tipe="jam"
            maks={5}
            placeholder="21:00"
          />
          <Isian
            label="Durasi tiap sesi (menit, 15 sampai 240)"
            nilai={nilai.durasi}
            onUbah={(v) => onUbah({ durasi: v })}
            nonaktif={nonaktif}
            tipe="angka"
            maks={3}
          />
          <Isian
            label="Maksimal belajar per hari (menit)"
            nilai={nilai.maksHari}
            onUbah={(v) => onUbah({ maksHari: v })}
            nonaktif={nonaktif}
            tipe="angka"
            maks={3}
          />
        </View>
      ) : null}
    </View>
  );
}

function DaftarSesi({
  sesi,
  aktifTarget,
  durasiMaks,
  nonaktif,
  onUbah,
}: {
  sesi: SesiEd[];
  aktifTarget: Set<string>;
  durasiMaks: number;
  nonaktif: boolean;
  onUbah: (kid: string, p: Partial<SesiEd>) => void;
}) {
  const dipilih = sesi.filter(
    (x) => x.pilih && !x.masalah && aktifTarget.has(x.target)
  ).length;
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.judulKecil}>
        Jadwal sesi belajar ({dipilih} dari {sesi.length} dipilih)
      </Text>
      {sesi.map((x) => {
        const berlaku = aktifTarget.has(x.target);
        const bisa = x.pilih && berlaku && !nonaktif;
        return (
          <View key={x.kid} style={s.kartuKecil}>
            <View style={s.baris}>
              <Centang
                nilai={x.pilih && berlaku}
                nonaktif={!berlaku || nonaktif}
                onUbah={(v) => onUbah(x.kid, { pilih: v })}
                label={`Simpan sesi ${x.namaTarget} ${tglId(x.tanggal)} ${x.jam}`}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.namaSesi} numberOfLines={1}>
                  {x.namaTarget}
                </Text>
                <Text style={s.ket}>
                  {tglId(x.tanggal)}, jam {x.jam}
                </Text>
              </View>
              <TextInput
                value={x.menit}
                editable={bisa}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(v) => onUbah(x.kid, { menit: v })}
                accessibilityLabel={`Menit sesi ${x.namaTarget} ${tglId(x.tanggal)} (5 sampai ${durasiMaks})`}
                style={[kolom, s.angka, !bisa && { opacity: 0.6 }]}
              />
              <Text style={s.ket}>mnt</Text>
            </View>
            {x.masalah ? (
              <Text accessibilityRole="alert" style={s.hambatan}>
                <Text style={{ fontWeight: "600" }}>Tidak bisa disimpan. </Text>
                {x.masalah}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* ====== Panel utama ====== */

export default function FormTujuanAI({
  terbuka,
  onTutup,
  onTersimpan,
}: {
  terbuka: boolean;
  onTutup: () => void;
  // dipanggil setelah panel selesai menutup; goalId null kalau id tujuan tidak diketahui
  onTersimpan: (goalId: string | null) => void | Promise<void>;
}) {
  const [kalimat, setKalimat] = useState("");
  const [f, setF] = useState(KOSONG);
  const [asumsi, setAsumsi] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [topik, setTopik] = useState<TopikEd[]>([]);
  const [jadwal, setJadwal] = useState<PengaturanJadwalEd>(JADWAL_AWAL);
  const [sesi, setSesi] = useState<SesiEd[]>([]);
  const [infoJadwal, setInfoJadwal] = useState<InfoJadwal | null>(null);
  const [catatanJadwal, setCatatanJadwal] = useState("");
  const [ada, setAda] = useState(false);
  const [pesan, setPesan] = useState("");
  const [perluAktif, setPerluAktif] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const hasilSimpan = useRef<{ pesan: string; goalId: string | null } | null>(
    null
  );

  const ubah = (p: Partial<typeof KOSONG>) => setF((a) => ({ ...a, ...p }));
  const ubahTopik = (kid: string, p: Partial<TopikEd>) =>
    setTopik((a) => a.map((t) => (t.kid === kid ? { ...t, ...p } : t)));
  const ubahSub = (kid: string, ks: string, p: Partial<SubEd>) =>
    setTopik((a) =>
      a.map((t) =>
        t.kid === kid
          ? { ...t, sub: t.sub.map((x) => (x.kid === ks ? { ...x, ...p } : x)) }
          : t
      )
    );
  const ubahSesi = (kid: string, p: Partial<SesiEd>) =>
    setSesi((a) => a.map((x) => (x.kid === kid ? { ...x, ...p } : x)));

  // Dikembalikan ke awal setelah panel selesai menutup
  function reset() {
    const h = hasilSimpan.current;
    hasilSimpan.current = null;
    setKalimat("");
    setF(KOSONG);
    setAsumsi([]);
    setCatatan("");
    setTopik([]);
    setSesi([]);
    setInfoJadwal(null);
    setCatatanJadwal("");
    setAda(false);
    setPesan("");
    setPerluAktif(false);
    setSibuk(false);
    if (h) {
      toast.sukses(h.pesan);
      Promise.resolve(onTersimpan(h.goalId)).catch(() => {});
    }
  }

  function tutup() {
    if (sibuk) return;
    onTutup();
  }

  async function ajukan() {
    if (jadwal.sekalian) {
      const salah = periksaPengaturan(jadwal);
      if (salah) {
        setPesan(salah);
        return;
      }
    }
    const h = await susunTujuanAI(kalimat);
    if (!h.ok) {
      setPerluAktif(Boolean(h.perluAktif));
      setPesan(h.perluAktif ? "" : h.pesan);
      return;
    }
    setPerluAktif(false);
    setF({
      judul: h.tujuan.judul,
      target: h.tujuan.target,
      tanggal: h.tujuan.tanggal,
      level: h.tujuan.level,
      menit: h.tujuan.menit,
      kriteria: h.tujuan.kriteria,
    });
    setAsumsi(h.tujuan.asumsi);
    setCatatan(h.catatan);
    setTopik(topikKeEd(h.topik));
    setSesi([]);
    setInfoJadwal(null);
    setCatatanJadwal("");

    // Jadwal ikut disusun (panggilan AI kedua, di panel yang sama)
    if (jadwal.sekalian && h.topik.length > 0) {
      const form = {
        jamMulai: jadwal.jamMulai,
        jamSelesai: jadwal.jamSelesai,
        durasi: Number(jadwal.durasi),
        maksHari: Number(jadwal.maksHari),
      };
      const j = await susunJadwalAI(
        {
          judul: h.tujuan.judul,
          target: h.tujuan.target,
          tanggal: h.tujuan.tanggal,
          level: h.tujuan.level,
          menit: h.tujuan.menit,
          topik: h.topik.map((t) => ({
            kid: t.kid,
            judul: t.judul,
            menit: t.menit,
            sub: t.sub.map((x) => ({
              kid: x.kid,
              judul: x.judul,
              menit: x.menit,
            })),
          })),
        },
        form
      );
      if (j.ok) {
        setSesi(sesiKeEd(j.sesi));
        setInfoJadwal({
          awal: j.awal,
          akhir: j.akhir,
          durasi: form.durasi,
          maksHari: form.maksHari,
          belum: j.belumTerjadwal,
        });
        setCatatanJadwal(j.catatan);
      } else {
        setCatatanJadwal(
          `Jadwal belum bisa disusun: ${j.pesan} Tujuan dan topik tetap bisa disimpan, lalu jadwalnya disusun lewat web.`
        );
      }
    }

    setAda(true);
    setPesan("");
  }

  async function proses() {
    if (sibuk) return;
    setPesan("");
    setSibuk(true);
    await ajukan();
    setSibuk(false);
  }

  async function aktifkan() {
    if (sibuk) return;
    setPesan("");
    setSibuk(true);
    const a = await aktifkanAI();
    if (!a.ok) {
      setPesan(a.pesan);
      setSibuk(false);
      return;
    }
    setPerluAktif(false);
    await ajukan();
    setSibuk(false);
  }

  const jumlahTopik = topik.reduce(
    (a, t) => a + (t.pilih ? 1 + t.sub.filter((x) => x.pilih).length : 0),
    0
  );

  // Sesi hanya berlaku kalau topik atau sub topiknya ikut dipilih
  const targetAktif = new Set<string>();
  for (const t of topik) {
    if (!t.pilih) continue;
    if (t.sub.length === 0) targetAktif.add(t.kid);
    for (const x of t.sub) if (x.pilih) targetAktif.add(x.kid);
  }
  const sesiAktif = sesi.filter(
    (x) => x.pilih && !x.masalah && targetAktif.has(x.target)
  );

  async function simpan() {
    if (sibuk) return;
    if (f.judul.trim().length < 1 || f.judul.trim().length > 120) {
      setPesan("Judul wajib diisi, maksimal 120 karakter.");
      return;
    }
    const t = bangunTopik(topik);
    if (typeof t === "string") {
      setPesan(t);
      return;
    }
    const muatan = { ...f, topik: t };

    // Ada jadwal yang dipilih: simpan tujuan, topik, dan sesi sekaligus
    if (sesiAktif.length > 0 && infoJadwal) {
      const kirim: {
        kid: string;
        target: string;
        tanggal: string;
        jam: string;
        menit: number;
      }[] = [];
      for (const x of sesiAktif) {
        const m = Number(x.menit);
        if (!Number.isInteger(m) || m < 5 || m > infoJadwal.durasi) {
          setPesan(
            `Durasi sesi harus angka bulat 5 sampai ${infoJadwal.durasi} menit.`
          );
          return;
        }
        kirim.push({
          kid: x.kid,
          target: x.target,
          tanggal: x.tanggal,
          jam: x.jam,
          menit: m,
        });
      }
      setPesan("");
      setSibuk(true);
      const h = await simpanTujuanJadwalAI(muatan, {
        durasi: infoJadwal.durasi,
        maksHari: infoJadwal.maksHari,
        sesi: kirim,
      });
      if (h.ok) {
        hasilSimpan.current = {
          pesan: `Tujuan tersimpan dengan ${h.topik} topik dan ${h.sesi} sesi`,
          goalId: null,
        };
        setSibuk(false);
        onTutup();
        return;
      }
      if (h.masalah && h.masalah.length > 0) {
        const peta = new Map(h.masalah.map((m) => [m.kid, m.pesan] as const));
        setSesi((a) =>
          a.map((x) =>
            peta.has(x.kid) ? { ...x, masalah: peta.get(x.kid) ?? null } : x
          )
        );
      }
      setPesan(h.pesan);
      setSibuk(false);
      return;
    }

    setPesan("");
    setSibuk(true);
    const h = await simpanTujuanAI(muatan);
    if (h.ok) {
      hasilSimpan.current = {
        pesan:
          h.topik > 0
            ? `Tujuan tersimpan dengan ${h.topik} topik`
            : "Tujuan berhasil ditambahkan",
        goalId: h.goalId,
      };
      setSibuk(false);
      onTutup();
      return;
    }
    setPesan(h.pesan);
    setSibuk(false);
  }

  const subJudul = perluAktif
    ? "Aktifkan AI untuk memakai fitur ini."
    : ada
      ? "Cek dan ubah dulu sebelum disimpan."
      : "Ceritakan apa yang ingin kamu kuasai.";

  return (
    <LembarBawah terbuka={terbuka} onTutup={tutup} onSelesaiTutup={reset}>
      {/* Kepala */}
      <View style={s.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={s.judulForm}>Tambah tujuan dengan AI</Text>
          <Text style={s.subForm}>{subJudul}</Text>
        </View>
        <Pressable
          onPress={tutup}
          accessibilityRole="button"
          accessibilityLabel="Tutup panel"
          style={s.tombolTutup}
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.mist}
            strokeWidth={2}
            strokeLinecap="round"
          >
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      </View>

      {perluAktif ? (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.teks}>
              Fitur ini memakai Google Gemini. Yang dikirim hanya kalimat yang
              kamu tulis dan tanggal hari ini.
            </Text>
            <Text style={s.teks}>
              Hasilnya tidak langsung disimpan: kamu selalu melihat pratinjau
              dulu dan memutuskan sendiri.
            </Text>
            {pesan ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {pesan}
              </Text>
            ) : null}
          </ScrollView>
          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={sibuk} onPress={tutup} />
            <Tombol
              label={sibuk ? "Memproses..." : "Aktifkan AI"}
              utama
              nonaktif={sibuk}
              onPress={aktifkan}
            />
          </View>
        </>
      ) : ada ? (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.teks}>
              Topik awal bersifat opsional: hapus centangnya kalau tidak mau.
            </Text>

            <Isian
              label="Judul tujuan"
              nilai={f.judul}
              onUbah={(v) => ubah({ judul: v })}
              nonaktif={sibuk}
              maks={120}
            />
            <Isian
              label="Target hasil"
              nilai={f.target}
              onUbah={(v) => ubah({ target: v })}
              nonaktif={sibuk}
              multiline
              maks={500}
            />
            <Isian
              label="Tanggal target (TTTT-BB-HH, boleh kosong)"
              nilai={f.tanggal}
              onUbah={(v) => ubah({ tanggal: v })}
              nonaktif={sibuk}
              tipe="jam"
              maks={10}
              placeholder="2026-12-31"
            />
            <View>
              <Text style={s.labelKecil}>Level awal</Text>
              <View style={s.barisLevel}>
                {LEVEL.map((l) => {
                  const aktif = f.level === l.nilai;
                  return (
                    <Pressable
                      key={l.nilai}
                      onPress={() => !sibuk && ubah({ level: l.nilai })}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: aktif }}
                      style={[s.chipLevel, aktif && s.chipLevelAktif]}
                    >
                      <Text
                        style={[
                          s.teksChipLevel,
                          { color: aktif ? C.ink : C.snow },
                        ]}
                      >
                        {l.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Isian
              label="Menit per minggu"
              nilai={f.menit}
              onUbah={(v) => ubah({ menit: v })}
              nonaktif={sibuk}
              tipe="angka"
              maks={5}
            />
            <Isian
              label="Kriteria selesai"
              nilai={f.kriteria}
              onUbah={(v) => ubah({ kriteria: v })}
              nonaktif={sibuk}
              multiline
              maks={500}
            />

            {asumsi.length > 0 ? (
              <View style={s.kotakInfo}>
                <Text style={s.judulKecil}>Asumsi AI</Text>
                {asumsi.map((a, i) => (
                  <Text key={i} style={s.ket}>
                    {"\u2022"} {a}
                  </Text>
                ))}
              </View>
            ) : null}
            {catatan ? (
              <Text style={s.kotakInfo}>
                <Text style={s.tebal}>Catatan AI: </Text>
                <Text style={s.ket}>{catatan}</Text>
              </Text>
            ) : null}

            {topik.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={s.judulKecil}>Topik awal</Text>
                <EditorTopik
                  topik={topik}
                  onTopik={ubahTopik}
                  onSub={ubahSub}
                />
              </View>
            ) : null}

            {catatanJadwal ? (
              <Text style={s.kotakInfo}>
                <Text style={s.tebal}>Catatan jadwal: </Text>
                <Text style={s.ket}>{catatanJadwal}</Text>
              </Text>
            ) : null}
            {infoJadwal && sesi.length > 0 ? (
              <>
                <Text style={s.ket}>
                  Jadwal disusun {tglId(infoJadwal.awal)} sampai{" "}
                  {tglId(infoJadwal.akhir)}. Dicek lagi saat disimpan supaya
                  tidak bentrok dengan acara, tugas, atau sesi lain.
                </Text>
                <DaftarSesi
                  sesi={sesi}
                  aktifTarget={targetAktif}
                  durasiMaks={infoJadwal.durasi}
                  nonaktif={sibuk}
                  onUbah={ubahSesi}
                />
              </>
            ) : null}
            {infoJadwal && infoJadwal.belum.length > 0 ? (
              <View style={{ gap: 4 }}>
                <Text style={s.judulKecil}>Belum terjadwal</Text>
                {infoJadwal.belum.map((b, i) => (
                  <Text key={i} style={s.ket}>
                    {"\u2022"} {b.nama}: sisa {b.menit} mnt
                  </Text>
                ))}
              </View>
            ) : null}

            {pesan ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {pesan}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol
              label="Ubah kalimat"
              nonaktif={sibuk}
              onPress={() => {
                setAda(false);
                setPesan("");
              }}
            />
            <Tombol
              label={
                sibuk
                  ? "Menyimpan..."
                  : jumlahTopik > 0
                    ? `Simpan tujuan, ${jumlahTopik} topik${
                        sesiAktif.length > 0
                          ? `, ${sesiAktif.length} sesi`
                          : ""
                      }`
                    : "Simpan tujuan"
              }
              utama
              nonaktif={sibuk}
              onPress={simpan}
            />
          </View>
        </>
      ) : (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.teks}>
              Tulis dengan kalimat biasa apa yang ingin kamu kuasai, kalau ada
              sebut juga level awal, jangka waktu, dan waktu belajarmu.
            </Text>
            <View>
              <TextInput
                value={kalimat}
                onChangeText={setKalimat}
                maxLength={MAKS}
                multiline
                editable={!sibuk}
                textAlignVertical="top"
                accessibilityLabel="Tujuan belajar yang ingin ditambahkan"
                placeholder="Contoh: saya pemula dan ingin bisa membuat aplikasi fullstack dengan Next.js dalam 3 bulan, belajar sekitar 1 jam per hari"
                placeholderTextColor={C.mist}
                style={[kolom, s.input]}
              />
              <Text style={s.hitung}>
                {kalimat.length}/{MAKS}
              </Text>
            </View>

            <PengaturanJadwal
              nilai={jadwal}
              onUbah={(p) => setJadwal((a) => ({ ...a, ...p }))}
              nonaktif={sibuk}
            />

            {sibuk ? (
              <Text style={s.teks}>
                AI sedang menyusun usulan
                {jadwal.sekalian ? " dan jadwalnya" : ""}. Ini bisa memakan
                waktu sampai beberapa menit, jangan tutup layar ini.
              </Text>
            ) : null}
            {pesan ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {pesan}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={sibuk} onPress={tutup} />
            <Tombol
              label={sibuk ? "Memproses..." : "Proses"}
              utama
              nonaktif={sibuk || kalimat.trim().length < 5}
              onPress={proses}
            />
          </View>
        </>
      )}
    </LembarBawah>
  );
}

const s = StyleSheet.create({
  kepala: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  judulForm: { fontSize: 18, fontWeight: "600", color: C.snow },
  subForm: { marginTop: 2, fontSize: 14, color: C.mist },
  tombolTutup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  isi: { padding: 20, gap: 14 },
  teks: { fontSize: 14, lineHeight: 20, color: C.mist },
  ket: { fontSize: 12, lineHeight: 17, color: C.mist },
  tebal: { fontSize: 13, fontWeight: "600", color: C.snow },
  labelKecil: { fontSize: 12, color: C.mist },
  judulKecil: { fontSize: 13, fontWeight: "600", color: C.snow },

  input: { minHeight: 110 },
  hitung: { marginTop: 4, textAlign: "right", fontSize: 12, color: C.mist },

  kotakJadwal: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.4)",
  },
  barisCentang: { flexDirection: "row", alignItems: "center", gap: 10 },
  teksCentang: { flex: 1, fontSize: 14, color: C.snow },

  barisLevel: { marginTop: 6, flexDirection: "row", gap: 8 },
  chipLevel: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipLevelAktif: { backgroundColor: C.aqua, borderColor: C.aqua },
  teksChipLevel: { fontSize: 13, fontWeight: "600" },

  kotakInfo: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(8,11,22,0.6)",
    fontSize: 13,
    lineHeight: 19,
    color: C.mist,
  },

  baris: { flexDirection: "row", alignItems: "center", gap: 8 },
  kartuKecil: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.4)",
  },
  namaSesi: { fontSize: 14, fontWeight: "500", color: C.snow },
  angka: { width: 56, textAlign: "center" },
  hambatan: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 12,
    lineHeight: 17,
    color: C.snow,
  },
  galat: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 13,
    lineHeight: 18,
    color: C.snow,
  },

  kaki: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tombol: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tombolUtama: { backgroundColor: C.aqua },
  tombolGaris: { borderWidth: 1, borderColor: C.line },
  teksTombol: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});