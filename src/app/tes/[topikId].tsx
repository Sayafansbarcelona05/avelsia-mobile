import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    BackHandler,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../components/dashboard/panel-kartu";
import { LembarBawah } from "../../components/tugas/lembar-bawah";
import { supabase } from "../../lib/supabase";
import {
    ambilHasilTes,
    ambilKuisBerjalan,
    catatPelanggaranTes,
    kumpulkanTes,
    simpanJawabanTes,
    type DataHasil,
    type KuisBerjalan,
} from "../../lib/tes";

const BATAS_PELANGGARAN = 3;
const AMBER = "#FBBF24";
const BRAND = "#5B6CFF";

type Fase = "memuat" | "tes" | "hasil" | "kosong" | "galat";
type StatusSimpan = "diam" | "menyimpan" | "tersimpan" | "gagal";

const TEKS_SIMPAN: Record<StatusSimpan, string> = {
  diam: "",
  menyimpan: "Menyimpan jawaban...",
  tersimpan: "Jawaban tersimpan",
  gagal: "Jawaban belum tersimpan. Coba pilih ulang jawabanmu.",
};

/* ====== Tombol kecil yang dipakai di mana-mana ====== */

function Tombol({
  label,
  gaya,
  memuat,
  nonaktif,
  onPress,
}: {
  label: string;
  gaya: "utama" | "garis" | "teks";
  memuat?: boolean;
  nonaktif?: boolean;
  onPress: () => void;
}) {
  const utama = gaya === "utama";
  return (
    <Pressable
      onPress={onPress}
      disabled={nonaktif}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.tombol,
        utama && s.tombolUtama,
        gaya === "garis" && s.tombolGaris,
        nonaktif && !memuat && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {memuat ? (
        <ActivityIndicator color={utama ? C.ink : C.snow} />
      ) : (
        <Text
          style={[
            s.teksTombol,
            { color: utama ? C.ink : gaya === "garis" ? C.snow : C.mist },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/* ====== Halaman ====== */

export default function HalamanTes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { topikId, goalId } = useLocalSearchParams<{
    topikId: string;
    goalId: string;
  }>();

  const [fase, setFase] = useState<Fase>("memuat");
  const [kuis, setKuis] = useState<KuisBerjalan | null>(null);
  const [hasil, setHasil] = useState<DataHasil | null>(null);
  const [nama, setNama] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");
  const [percobaan, setPercobaan] = useState(0);

  const kembali = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace((goalId ? `/tujuan/${goalId}` : "/belajar") as never);
  }, [router, goalId]);

  const muatHasil = useCallback(async () => {
    if (!topikId || !goalId) {
      setFase("kosong");
      return;
    }
    const r = await ambilHasilTes(topikId, goalId);
    if (!r.ok) {
      setPesanGalat(r.pesan);
      setFase("galat");
      return;
    }
    if (r.hasil) {
      setHasil(r.hasil);
      setFase("hasil");
    } else {
      setFase("kosong");
    }
  }, [topikId, goalId]);

  useEffect(() => {
    let aktif = true;
    (async () => {
      if (!topikId || !goalId) {
        setFase("kosong");
        return;
      }
      setFase("memuat");
      try {
        const { data: t } = await supabase
          .from("learning_topics")
          .select("title, parent_id")
          .eq("id", topikId)
          .maybeSingle();
        let judul = (t?.title as string | undefined) ?? "";
        if (t?.parent_id) {
          const { data: induk } = await supabase
            .from("learning_topics")
            .select("title")
            .eq("id", t.parent_id as string)
            .maybeSingle();
          if (induk?.title) judul = `${induk.title as string} › ${judul}`;
        }
        if (!aktif) return;
        setNama(judul);

        const k = await ambilKuisBerjalan(topikId);
        if (!aktif) return;
        if (k) {
          setKuis(k);
          setFase("tes");
        } else {
          await muatHasil();
        }
      } catch {
        if (aktif) {
          setPesanGalat("Gagal memuat tes. Periksa koneksi internetmu.");
          setFase("galat");
        }
      }
    })();
    return () => {
      aktif = false;
    };
  }, [topikId, goalId, muatHasil, percobaan]);

  return (
    <View style={[s.layar, { paddingTop: insets.top }]}>
      {fase === "memuat" ? (
        <View style={s.tengah}>
          <ActivityIndicator color={C.aqua} />
        </View>
      ) : fase === "tes" && kuis ? (
        <RuangTes
          kuis={kuis}
          nama={nama}
          bawah={insets.bottom}
          onSelesai={() => {
            setFase("memuat");
            void muatHasil();
          }}
          onKeluar={kembali}
        />
      ) : fase === "hasil" && hasil ? (
        <HasilTes hasil={hasil} nama={nama} bawah={insets.bottom} onKembali={kembali} />
      ) : (
        <View style={s.tengah}>
          <Text style={s.judulTengah}>
            {fase === "galat" ? "Tes belum bisa dimuat" : "Belum ada tes yang berjalan."}
          </Text>
          <Text style={s.teksTengah}>
            {fase === "galat"
              ? pesanGalat
              : "Mulai dari menu topik, pilih Tes topik di topik atau sub topik yang sudah punya sesi selesai."}
          </Text>
          <View style={s.aksiTengah}>
            {fase === "galat" ? (
              <Tombol label="Coba lagi" gaya="utama" onPress={() => setPercobaan((n) => n + 1)} />
            ) : null}
            <Tombol label="Kembali ke tujuan" gaya="garis" onPress={kembali} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ====== Ruang tes ====== */

function RuangTes({
  kuis,
  nama,
  bawah,
  onSelesai,
  onKeluar,
}: {
  kuis: KuisBerjalan;
  nama: string;
  bawah: number;
  onSelesai: () => void;
  onKeluar: () => void;
}) {
  const { soal } = kuis;
  const [jawaban, setJawaban] = useState<Record<string, string>>(kuis.jawaban);
  const [pelanggaran, setPelanggaran] = useState(kuis.pelanggaran);
  const [dibatalkan, setDibatalkan] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [statusSimpan, setStatusSimpan] = useState<StatusSimpan>("diam");
  const [indeks, setIndeks] = useState(0);
  const [ragu, setRagu] = useState<Record<string, boolean>>({});
  const [peringatan, setPeringatan] = useState("");
  const [konfirmasiKumpul, setKonfirmasiKumpul] = useState(false);
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [mengumpulkan, setMengumpulkan] = useState(false);
  const [galatKumpul, setGalatKumpul] = useState("");

  const terbaru = useRef<Record<string, string>>(kuis.jawaban);
  const sedangSimpan = useRef(false);
  const perluUlang = useRef(false);
  const terakhirCatat = useRef(0);

  // Penyimpanan berurutan: klik cepat tidak membuat urutan tulis terbalik
  async function simpan() {
    if (sedangSimpan.current) {
      perluUlang.current = true;
      return;
    }
    sedangSimpan.current = true;
    setStatusSimpan("menyimpan");
    let berhasil = true;
    do {
      perluUlang.current = false;
      try {
        const hasil = await simpanJawabanTes(kuis.id, terbaru.current);
        berhasil = hasil.ok;
      } catch {
        berhasil = false;
      }
    } while (perluUlang.current);
    sedangSimpan.current = false;
    setStatusSimpan(berhasil ? "tersimpan" : "gagal");
  }

  function pilih(soalId: string, pilihanId: string) {
    const baru = { ...terbaru.current, [soalId]: pilihanId };
    terbaru.current = baru;
    setJawaban(baru);
    setPeringatan("");
    void simpan();
  }

  // Keluar dari app (ke latar belakang) dihitung sebagai pelanggaran
  useEffect(() => {
    if (dibatalkan || selesai) return;
    const langganan = AppState.addEventListener("change", (status) => {
      if (status !== "background") return;
      const sekarang = Date.now();
      if (sekarang - terakhirCatat.current < 2000) return;
      terakhirCatat.current = sekarang;

      catatPelanggaranTes(kuis.id)
        .then((hasil) => {
          if (!hasil.ok) return;
          setPelanggaran(hasil.pelanggaran);
          if (hasil.gagal) setDibatalkan(true);
          else {
            setPeringatan(
              `Kamu meninggalkan tes. Pelanggaran ${hasil.pelanggaran} dari ${BATAS_PELANGGARAN}.`
            );
          }
        })
        .catch(() => {});
    });
    return () => langganan.remove();
  }, [kuis.id, dibatalkan, selesai]);

  // Tombol kembali Android: tanya dulu, jangan langsung keluar
  useEffect(() => {
    if (dibatalkan || selesai) return;
    const langganan = BackHandler.addEventListener("hardwareBackPress", () => {
      setKonfirmasiKeluar(true);
      return true;
    });
    return () => langganan.remove();
  }, [dibatalkan, selesai]);

  const terjawab = soal.filter((x) => jawaban[x.id]).length;
  const belum = soal.length - terjawab;
  const jumlahRagu = soal.filter((x) => ragu[x.id]).length;

  const posisi = Math.min(indeks, soal.length - 1);
  const aktif = soal[posisi];
  const pertama = posisi === 0;
  const terakhir = posisi === soal.length - 1;
  const sudahDijawab = Boolean(jawaban[aktif.id]);
  const sedangRagu = Boolean(ragu[aktif.id]);

  function pindah(ke: number) {
    setIndeks(Math.max(0, Math.min(ke, soal.length - 1)));
  }

  async function kirim() {
    if (mengumpulkan) return;
    setGalatKumpul("");
    setMengumpulkan(true);
    try {
      // Jawaban dikirim langsung dari app, bukan dibaca dari simpanan otomatis
      const hasil = await kumpulkanTes(kuis.id, terbaru.current);
      if (hasil.ok) {
        setSelesai(true);
        setKonfirmasiKumpul(false);
        onSelesai();
      } else {
        setGalatKumpul(hasil.pesan);
      }
    } catch {
      setGalatKumpul("Jawaban gagal dikumpulkan. Coba lagi.");
    } finally {
      setMengumpulkan(false);
    }
  }

  if (dibatalkan) {
    return (
      <View style={s.tengah}>
        <Text style={s.judulTengah}>Tes dibatalkan.</Text>
        <Text style={s.teksTengah}>
          Kamu sudah {BATAS_PELANGGARAN} kali meninggalkan tes, jadi tes ini
          dianggap gagal. Kamu bisa memulai tes baru dari topiknya.
        </Text>
        <View style={s.aksiTengah}>
          <Tombol label="Kembali ke tujuan" gaya="utama" onPress={onKeluar} />
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 + bawah, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bar atas */}
        <View style={s.kepala}>
          <Text style={s.kecil}>SOAL UJIAN</Text>
          <Text style={s.namaTopik} numberOfLines={2}>
            {nama}
          </Text>
          <Text style={s.pelanggaran}>
            Pelanggaran: {pelanggaran} dari {BATAS_PELANGGARAN}
          </Text>
        </View>

        {peringatan ? <Text style={s.peringatan}>{peringatan}</Text> : null}

        {/* Kartu soal */}
        <View style={s.kartu}>
          <View style={s.barisAtasKartu}>
            <View style={s.nomorWadah}>
              <Text style={s.kecil}>SOAL NO</Text>
              <View style={s.nomor}>
                <Text style={s.teksNomor}>{posisi + 1}</Text>
              </View>
            </View>
            <View style={s.lencanaWadah}>
              {sedangRagu ? (
                <Text style={[s.lencana, { color: AMBER, backgroundColor: "rgba(251,191,36,0.15)" }]}>
                  Ragu-ragu
                </Text>
              ) : null}
              <Text
                style={[
                  s.lencana,
                  sudahDijawab
                    ? { color: C.aqua, backgroundColor: "rgba(50,217,255,0.15)" }
                    : { color: C.mist, backgroundColor: "rgba(255,255,255,0.06)" },
                ]}
              >
                {sudahDijawab ? "Terjawab" : "Belum dijawab"}
              </Text>
            </View>
          </View>

          <Text style={s.pertanyaan}>{aktif.pertanyaan}</Text>

          <View style={{ marginTop: 16, gap: 8 }}>
            {aktif.pilihan.map((p, j) => {
              const dipilih = jawaban[aktif.id] === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => pilih(aktif.id, p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: dipilih }}
                  style={[s.pilihan, dipilih && s.pilihanAktif]}
                >
                  <View style={[s.huruf, dipilih && s.hurufAktif]}>
                    <Text style={[s.teksHuruf, { color: dipilih ? C.ink : C.mist }]}>
                      {"ABCD"[j] ?? j + 1}
                    </Text>
                  </View>
                  <Text style={s.teksPilihan}>{p.teks}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.navigasiKartu}>
            <Tombol label="Sebelumnya" gaya="garis" nonaktif={pertama} onPress={() => pindah(posisi - 1)} />
            <Pressable
              onPress={() => setRagu((r) => ({ ...r, [aktif.id]: !r[aktif.id] }))}
              accessibilityRole="button"
              accessibilityState={{ selected: sedangRagu }}
              style={[s.tombol, s.tombolRagu, sedangRagu && { backgroundColor: AMBER }]}
            >
              <Text style={[s.teksTombol, { color: sedangRagu ? C.ink : AMBER }]}>Ragu-ragu</Text>
            </Pressable>
            <Tombol label="Selanjutnya" gaya="utama" nonaktif={terakhir} onPress={() => pindah(posisi + 1)} />
          </View>

          <Text style={s.statusSimpan}>{TEKS_SIMPAN[statusSimpan]}</Text>
        </View>

        {/* Navigasi soal */}
        <View style={s.kartu}>
          <View style={s.barisAtasKartu}>
            <Text style={s.judulKartu}>Navigasi soal</Text>
            <Text style={s.kecilTebal}>
              {terjawab} dari {soal.length} terjawab
            </Text>
          </View>

          <View style={s.grid}>
            {soal.map((x, i) => {
              const dijawab = Boolean(jawaban[x.id]);
              const raguX = Boolean(ragu[x.id]);
              const dilihat = i === posisi;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => pindah(i)}
                  accessibilityLabel={`Soal ${i + 1}, ${raguX ? "ragu-ragu" : dijawab ? "sudah dijawab" : "belum dijawab"}`}
                  style={[
                    s.kotakNomor,
                    { backgroundColor: raguX ? AMBER : dijawab ? C.aqua : C.line },
                    dilihat && { borderWidth: 2, borderColor: C.snow },
                  ]}
                >
                  <Text style={[s.teksKotak, { color: raguX || dijawab ? C.ink : C.snow }]}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.legenda}>
            <Text style={s.teksLegenda}>
              <Text style={{ color: C.aqua }}>■</Text> Sudah dijawab{"   "}
              <Text style={{ color: C.mist }}>■</Text> Belum{"   "}
              <Text style={{ color: AMBER }}>■</Text> Ragu-ragu
            </Text>
          </View>

          <Text style={s.aturan}>
            Lulus jika benar minimal {kuis.passPercent}%. Jangan memakai AI atau
            alat bantu apa pun. Keluar dari app dihitung sebagai pelanggaran, dan
            pada pelanggaran ke-{BATAS_PELANGGARAN} tes dianggap gagal.
          </Text>

          {belum > 0 ? (
            <Text style={s.aturan}>Masih ada {belum} soal yang belum dijawab.</Text>
          ) : null}

          <View style={{ marginTop: 14 }}>
            <Tombol
              label="Kumpulkan jawaban"
              gaya="utama"
              nonaktif={belum > 0 || mengumpulkan}
              onPress={() => {
                setGalatKumpul("");
                setKonfirmasiKumpul(true);
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Konfirmasi kumpulkan */}
      <LembarBawah terbuka={konfirmasiKumpul} onTutup={() => !mengumpulkan && setKonfirmasiKumpul(false)}>
        <View style={s.isiLembar}>
          <Text style={s.judulLembar}>Kumpulkan jawaban?</Text>
          <Text style={s.teksLembar}>
            Setelah dikumpulkan, jawaban tidak bisa diubah dan tes langsung
            dinilai. Batas lulus {kuis.passPercent}%.
          </Text>
          {jumlahRagu > 0 ? (
            <Text style={[s.teksLembar, { color: AMBER }]}>
              Masih ada {jumlahRagu} soal yang kamu tandai ragu-ragu.
            </Text>
          ) : null}
          {galatKumpul ? <Text style={s.galat}>{galatKumpul}</Text> : null}
          <View style={s.aksiLembar}>
            <Tombol label={mengumpulkan ? "Menilai..." : "Kumpulkan"} gaya="utama" memuat={mengumpulkan} nonaktif={mengumpulkan} onPress={kirim} />
            <Tombol label="Batal" gaya="garis" nonaktif={mengumpulkan} onPress={() => setKonfirmasiKumpul(false)} />
          </View>
        </View>
      </LembarBawah>

      {/* Konfirmasi keluar sementara */}
      <LembarBawah terbuka={konfirmasiKeluar} onTutup={() => setKonfirmasiKeluar(false)}>
        <View style={s.isiLembar}>
          <Text style={s.judulLembar}>Keluar dari tes?</Text>
          <Text style={s.teksLembar}>
            Jawabanmu tersimpan dan tes bisa dilanjutkan lewat menu topik. Soal
            tidak dibuat ulang.
          </Text>
          <View style={s.aksiLembar}>
            <Tombol label="Lanjut mengerjakan" gaya="utama" onPress={() => setKonfirmasiKeluar(false)} />
            <Tombol label="Keluar" gaya="garis" onPress={onKeluar} />
          </View>
        </View>
      </LembarBawah>
    </>
  );
}

/* ====== Hasil dan pembahasan ====== */

function HasilTes({
  hasil,
  nama,
  bawah,
  onKembali,
}: {
  hasil: DataHasil;
  nama: string;
  bawah: number;
  onKembali: () => void;
}) {
  const lulus = hasil.status === "passed";
  const dihentikan = hasil.benar === null;

  return (
    <>
    <View style={s.barKembali}>
      <Pressable
        onPress={onKembali}
        accessibilityRole="button"
        accessibilityLabel="Kembali ke tujuan"
        hitSlop={8}
        style={({ pressed }) => [s.tombolKembali, pressed && { opacity: 0.7 }]}
      >
        <Text style={s.panahKembali}>‹</Text>
        <Text style={s.teksKembali}>Kembali</Text>
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 + bawah, gap: 14 }}>
      <View style={s.kepala}>
        <Text style={s.kecil}>HASIL TES</Text>
        <Text style={s.namaTopik} numberOfLines={2}>
          {nama}
        </Text>
      </View>

      <View style={s.kartu}>
        <Text style={s.judulHasil}>
          {dihentikan ? "Tes dihentikan" : lulus ? "Lulus" : "Belum lulus"}
        </Text>
        {dihentikan ? (
          <Text style={s.teksLembar}>
            Tes ini dihentikan karena {hasil.pelanggaran} pelanggaran dan tidak
            dinilai. Kamu bisa memulai tes baru dari menu topik.
          </Text>
        ) : (
          <>
            <Text style={[s.teksLembar, { color: C.snow }]}>
              {hasil.benar} dari {hasil.total} soal benar ({hasil.skor}%). Batas
              lulus {hasil.lulusPersen}%.
            </Text>
            <Text style={s.teksLembar}>
              {lulus
                ? "Status topik ini menjadi Selesai. Kalau belum berubah, ubah lewat menu topik."
                : "Pelajari lagi bagian yang salah, lalu coba tes baru dari menu topik. Soal akan dibuat ulang."}
            </Text>
          </>
        )}
        <View style={{ marginTop: 16 }}>
          <Tombol label="Kembali ke tujuan" gaya="utama" onPress={onKembali} />
        </View>
      </View>

      {hasil.soal.length > 0 ? (
        <>
          <Text style={s.judulKartu}>Pembahasan</Text>
          {hasil.soal.map((x, i) => {
            const betul = x.jawabanmu === x.benar;
            return (
              <View key={x.id} style={s.kartu}>
                <Text style={s.pertanyaan}>
                  <Text style={{ color: C.mist }}>{i + 1}. </Text>
                  {x.pertanyaan}
                </Text>
                <Text style={s.kecilTebal}>
                  {x.jawabanmu === null ? "Tidak dijawab" : betul ? "Jawabanmu benar" : "Jawabanmu salah"}
                </Text>

                <View style={{ marginTop: 10, gap: 8 }}>
                  {x.pilihan.map((p, j) => {
                    const adalahBenar = p.id === x.benar;
                    const dipilih = p.id === x.jawabanmu;
                    return (
                      <View
                        key={p.id}
                        style={[
                          s.pilihan,
                          adalahBenar && { borderColor: C.aqua, backgroundColor: "rgba(50,217,255,0.10)" },
                          !adalahBenar && dipilih && { borderColor: C.mist },
                        ]}
                      >
                        <View style={s.huruf}>
                          <Text style={[s.teksHuruf, { color: C.mist }]}>{"ABCD"[j] ?? j + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.teksPilihan}>{p.teks}</Text>
                          {adalahBenar || dipilih ? (
                            <Text style={s.penanda}>
                              {adalahBenar && dipilih ? "Jawabanmu, benar" : adalahBenar ? "Jawaban benar" : "Jawabanmu"}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {x.penjelasan ? (
                  <Text style={[s.teksLembar, { marginTop: 12 }]}>
                    <Text style={{ fontWeight: "600", color: C.snow }}>Penjelasan: </Text>
                    {x.penjelasan}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}
      <View style={{ marginTop: 4 }}>
        <Tombol label="Kembali ke tujuan" gaya="garis" onPress={onKembali} />
      </View>
    </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: C.ink },
  barKembali: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tombolKembali: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  panahKembali: { fontSize: 28, lineHeight: 30, color: C.snow },
  teksKembali: { fontSize: 15, fontWeight: "600", color: C.snow },
  tengah: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  judulTengah: { fontSize: 18, fontWeight: "600", color: C.snow, textAlign: "center" },
  teksTengah: { fontSize: 14, lineHeight: 20, color: C.mist, textAlign: "center" },
  aksiTengah: { marginTop: 8, gap: 10, alignSelf: "stretch" },

  kepala: { backgroundColor: BRAND, borderRadius: 18, padding: 16, gap: 2 },
  kecil: { fontSize: 11, fontWeight: "600", letterSpacing: 1.5, color: "rgba(245,247,255,0.8)" },
  kecilTebal: { fontSize: 12, color: C.mist },
  namaTopik: { fontSize: 16, fontWeight: "600", color: C.snow },
  pelanggaran: { marginTop: 6, fontSize: 12, fontWeight: "600", color: C.snow },
  peringatan: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AMBER,
    fontSize: 13,
    lineHeight: 18,
    color: AMBER,
  },

  kartu: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16 },
  barisAtasKartu: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  nomorWadah: { flexDirection: "row", alignItems: "center", gap: 10 },
  nomor: { width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  teksNomor: { fontSize: 12, fontWeight: "600", color: C.snow },
  lencanaWadah: { flexDirection: "row", gap: 8 },
  lencana: { fontSize: 12, fontWeight: "500", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  pertanyaan: { marginTop: 14, fontSize: 15, lineHeight: 22, color: C.snow },

  pilihan: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  pilihanAktif: { borderColor: C.aqua, backgroundColor: "rgba(50,217,255,0.10)" },
  huruf: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  hurufAktif: { backgroundColor: C.aqua, borderColor: C.aqua },
  teksHuruf: { fontSize: 12, fontWeight: "600" },
  teksPilihan: { flex: 1, fontSize: 14, lineHeight: 20, color: C.snow },
  penanda: { marginTop: 4, fontSize: 11, fontWeight: "500", color: C.mist },

  navigasiKartu: { marginTop: 18, gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line },
  statusSimpan: { marginTop: 10, minHeight: 18, fontSize: 12, color: C.mist },

  judulKartu: { fontSize: 15, fontWeight: "600", color: C.snow },
  grid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kotakNomor: { width: 44, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  teksKotak: { fontSize: 13, fontWeight: "600" },
  legenda: { marginTop: 14 },
  teksLegenda: { fontSize: 12, color: C.mist },
  aturan: { marginTop: 12, fontSize: 12, lineHeight: 18, color: C.mist },

  judulHasil: { fontSize: 20, fontWeight: "600", color: C.snow, marginBottom: 6 },

  isiLembar: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  judulLembar: { fontSize: 18, fontWeight: "600", color: C.snow },
  teksLembar: { marginTop: 8, fontSize: 14, lineHeight: 20, color: C.mist },
  aksiLembar: { marginTop: 20, gap: 10 },
  galat: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 13,
    lineHeight: 18,
    color: C.snow,
  },

  tombol: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tombolUtama: { backgroundColor: C.aqua },
  tombolGaris: { borderWidth: 1, borderColor: C.line },
  tombolRagu: { borderWidth: 1, borderColor: AMBER },
  teksTombol: { fontSize: 14, fontWeight: "600" },
});