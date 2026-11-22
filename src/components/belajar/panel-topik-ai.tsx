import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { aktifkanAI } from "../../lib/ai-tugas";
import {
    simpanRencanaAI,
    susunPecahanAI,
    susunTopikAI,
} from "../../lib/belajar-ai";
import {
    bangunSub,
    bangunTopik,
    subKeEd,
    topikKeEd,
    type SubEd,
    type TopikEd,
} from "../../lib/belajar-ai-ed";
import { C } from "../dashboard/panel-kartu";
import { toast } from "../toast";
import { LembarBawah } from "../tugas/lembar-bawah";
import { BarisSub, EditorTopik } from "./editor-topik";

// Nilai ini hanya dipakai untuk jadwal sesi; di sini tidak ada sesi yang dibuat
const TANPA_SESI = { durasi: 45, maksHari: 120 };

export type TargetPecah = {
  topikId: string;
  judul: string;
  estimasi: number | null;
};

/* ====== Bagian tampilan bersama ====== */

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

function Kepala({
  judul,
  sub,
  onTutup,
}: {
  judul: string;
  sub?: string;
  onTutup: () => void;
}) {
  return (
    <View style={s.kepala}>
      <View style={{ flex: 1 }}>
        <Text style={s.judulForm}>{judul}</Text>
        {sub ? (
          <Text style={s.subForm} numberOfLines={3}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onTutup}
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
  );
}

function Langkah({ daftar }: { daftar: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      {daftar.map((teks, i) => (
        <View key={teks} style={s.langkah}>
          <View style={s.nomorLangkah}>
            <Text style={s.teksNomorLangkah}>{i + 1}</Text>
          </View>
          <Text style={s.teksLangkah}>{teks}</Text>
        </View>
      ))}
    </View>
  );
}

function SedangMemuat({ teks }: { teks: string }) {
  return (
    <View style={s.memuat}>
      <ActivityIndicator color={C.aqua} />
      <Text style={s.teksMemuat}>{teks}</Text>
    </View>
  );
}

function Persetujuan({ apaYangDikirim }: { apaYangDikirim: string }) {
  return (
    <>
      <Text style={s.teks}>
        Fitur ini memakai Google Gemini. {apaYangDikirim}
      </Text>
      <Text style={s.teks}>
        Hasilnya tidak langsung disimpan: kamu selalu melihat pratinjau dulu dan
        memutuskan sendiri.
      </Text>
    </>
  );
}

function Galat({ pesan }: { pesan: string }) {
  if (!pesan) return null;
  return (
    <Text accessibilityRole="alert" style={s.galat}>
      {pesan}
    </Text>
  );
}

function Catatan({ catatan }: { catatan: string }) {
  if (!catatan) return null;
  return (
    <Text style={s.kotakInfo}>
      <Text style={s.tebal}>Catatan AI: </Text>
      <Text style={s.ket}>{catatan}</Text>
    </Text>
  );
}

/* ====== Tambah topik dengan AI ====== */

export function TambahTopikAI({
  terbuka,
  goalId,
  onTutup,
  onTersimpan,
}: {
  terbuka: boolean;
  goalId: string;
  onTutup: () => void;
  onTersimpan: () => void | Promise<void>; // dipanggil setelah panel selesai menutup
}) {
  const [topik, setTopik] = useState<TopikEd[]>([]);
  const [catatan, setCatatan] = useState("");
  const [ada, setAda] = useState(false);
  const [pesan, setPesan] = useState("");
  const [perluAktif, setPerluAktif] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const hasilSimpan = useRef<string | null>(null);

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

  function kosongkan() {
    setTopik([]);
    setCatatan("");
    setAda(false);
    setPesan("");
  }

  // Dikembalikan ke awal setelah panel selesai menutup
  function reset() {
    const h = hasilSimpan.current;
    hasilSimpan.current = null;
    kosongkan();
    setPerluAktif(false);
    setSibuk(false);
    if (h) {
      toast.sukses(h);
      Promise.resolve(onTersimpan()).catch(() => {});
    }
  }

  function tutup() {
    if (sibuk) return;
    onTutup();
  }

  async function ajukan() {
    const h = await susunTopikAI(goalId);
    if (!h.ok) {
      setPerluAktif(Boolean(h.perluAktif));
      setPesan(h.perluAktif ? "" : h.pesan);
      return;
    }
    setPerluAktif(false);
    setTopik(topikKeEd(h.topik));
    setCatatan(h.catatan);
    setAda(true);
    setPesan("");
  }

  async function cari() {
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

  const jumlah = topik.reduce(
    (a, t) => a + (t.pilih ? 1 + t.sub.filter((x) => x.pilih).length : 0),
    0
  );

  async function simpan() {
    if (sibuk) return;
    const t = bangunTopik(topik);
    if (typeof t === "string") {
      setPesan(t);
      return;
    }
    if (t.length === 0) {
      setPesan("Belum ada topik yang dipilih.");
      return;
    }
    setPesan("");
    setSibuk(true);
    const h = await simpanRencanaAI({
      goalId,
      ...TANPA_SESI,
      topikBaru: t,
      tambahan: [],
      sesi: [],
    });
    if (h.ok) {
      hasilSimpan.current = `${h.topik} topik ditambahkan`;
      setSibuk(false);
      onTutup();
      return;
    }
    setPesan(h.pesan);
    setSibuk(false);
  }

  return (
    <LembarBawah terbuka={terbuka} onTutup={tutup} onSelesaiTutup={reset}>
      <Kepala
        judul="Tambah topik dengan AI"
        sub={
          ada
            ? "Centang topik yang mau disimpan. Judul dan menit boleh kamu ubah."
            : "AI mengusulkan topik yang belum ada di tujuan ini."
        }
        onTutup={tutup}
      />

      {perluAktif ? (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            <Persetujuan apaYangDikirim="Yang dikirim: judul, target, dan kriteria tujuan ini, serta daftar topikmu beserta estimasinya." />
            <Galat pesan={pesan} />
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
              Topik yang sudah ada tidak diubah. Hanya topik yang kamu centang
              yang akan ditambahkan.
            </Text>
            <Catatan catatan={catatan} />
            <EditorTopik topik={topik} onTopik={ubahTopik} onSub={ubahSub} />
            <Galat pesan={pesan} />
          </ScrollView>
          <View style={s.kaki}>
            <Tombol
              label="Cari usulan lain"
              nonaktif={sibuk}
              onPress={kosongkan}
            />
            <Tombol
              label={sibuk ? "Menyimpan..." : `Simpan ${jumlah} topik`}
              utama
              nonaktif={sibuk || jumlah === 0}
              onPress={simpan}
            />
          </View>
        </>
      ) : (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            {sibuk ? (
              <SedangMemuat teks="AI sedang menyusun usulan. Ini bisa memakan waktu sampai satu menit, jangan tutup layar ini." />
            ) : (
              <Langkah
                daftar={[
                  "AI membaca tujuan dan topik yang sudah kamu punya.",
                  "AI mengusulkan topik yang belum ada. Topik lama tidak diubah.",
                  "Kamu melihat pratinjau dulu dan memilih mana yang disimpan. Tidak ada yang tersimpan sebelum kamu setuju.",
                ]}
              />
            )}
            <Galat pesan={pesan} />
          </ScrollView>
          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={sibuk} onPress={tutup} />
            <Tombol
              label={sibuk ? "Menyusun..." : "Cari usulan topik"}
              utama
              nonaktif={sibuk}
              onPress={cari}
            />
          </View>
        </>
      )}
    </LembarBawah>
  );
}

/* ====== Pecahkan topik dengan AI ====== */

export function PecahTopikAI({
  target,
  goalId,
  onTutup,
  onTersimpan,
}: {
  target: TargetPecah | null;
  goalId: string;
  onTutup: () => void;
  onTersimpan: () => void | Promise<void>; // dipanggil setelah panel selesai menutup
}) {
  // "item" menyimpan target terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<TargetPecah | null>(target);
  const [sub, setSub] = useState<SubEd[]>([]);
  const [estimasiAsal, setEstimasiAsal] = useState<number | null>(null);
  const [catatan, setCatatan] = useState("");
  const [ada, setAda] = useState(false);
  const [pesan, setPesan] = useState("");
  const [perluAktif, setPerluAktif] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const hasilSimpan = useRef<string | null>(null);

  useEffect(() => {
    if (target) setItem(target);
  }, [target]);

  const data = target ?? item;

  const ubahSub = (kid: string, p: Partial<SubEd>) =>
    setSub((a) => a.map((x) => (x.kid === kid ? { ...x, ...p } : x)));

  function kosongkan() {
    setSub([]);
    setCatatan("");
    setAda(false);
    setPesan("");
  }

  // Dikembalikan ke awal setelah panel selesai menutup
  function reset() {
    const h = hasilSimpan.current;
    hasilSimpan.current = null;
    kosongkan();
    setItem(null);
    setEstimasiAsal(null);
    setPerluAktif(false);
    setSibuk(false);
    if (h) {
      toast.sukses(h);
      Promise.resolve(onTersimpan()).catch(() => {});
    }
  }

  function tutup() {
    if (sibuk) return;
    onTutup();
  }

  async function ajukan() {
    if (!data) return;
    const h = await susunPecahanAI(goalId, data.topikId);
    if (!h.ok) {
      setPerluAktif(Boolean(h.perluAktif));
      setPesan(h.perluAktif ? "" : h.pesan);
      return;
    }
    setPerluAktif(false);
    setSub(h.sub.map(subKeEd));
    setEstimasiAsal(h.estimasi);
    setCatatan(h.catatan);
    setAda(true);
    setPesan("");
  }

  async function pecah() {
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

  const dipilih = sub.filter((x) => x.pilih);
  const total = dipilih.reduce((a, x) => a + (Number(x.menit) || 0), 0);

  async function simpan() {
    if (sibuk || !data) return;
    const hasil = bangunSub(sub);
    if (typeof hasil === "string") {
      setPesan(hasil);
      return;
    }
    if (hasil.length === 0) {
      setPesan("Pilih minimal satu sub topik.");
      return;
    }
    setPesan("");
    setSibuk(true);
    const h = await simpanRencanaAI({
      goalId,
      ...TANPA_SESI,
      topikBaru: [],
      tambahan: [{ kid: "x1", indukId: data.topikId, sub: hasil }],
      sesi: [],
    });
    if (h.ok) {
      hasilSimpan.current = `${h.topik} sub topik ditambahkan`;
      setSibuk(false);
      onTutup();
      return;
    }
    setPesan(h.pesan);
    setSibuk(false);
  }

  const langkahAwal = data
    ? [
        `AI memecah topik “${data.judul}” menjadi sub topik yang berurutan.`,
        ...(data.estimasi != null
          ? [
              `Total estimasi sub topik kira-kira sama dengan estimasi topik (${data.estimasi} menit).`,
            ]
          : []),
        "Kamu melihat pratinjau dulu dan memilih mana yang disimpan. Tidak ada yang tersimpan sebelum kamu setuju.",
      ]
    : [];

  return (
    <LembarBawah terbuka={target !== null} onTutup={tutup} onSelesaiTutup={reset}>
      <Kepala
        judul="Pecahkan topik dengan AI"
        sub={data ? `Topik: ${data.judul}` : undefined}
        onTutup={tutup}
      />

      {perluAktif ? (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            <Persetujuan apaYangDikirim="Yang dikirim: judul, target, dan kriteria tujuan ini, judul topik yang dipecah beserta estimasinya, dan judul topik lain di tujuan ini." />
            <Galat pesan={pesan} />
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
              Centang yang mau disimpan, dan ubah judul atau menitnya kalau
              perlu. Estimasi topik ini nanti dihitung otomatis dari total sub
              topiknya.
            </Text>
            <Catatan catatan={catatan} />
            <View style={{ gap: 14 }}>
              {sub.map((x) => (
                <BarisSub
                  key={x.kid}
                  sub={x}
                  aktif
                  onUbah={(p) => ubahSub(x.kid, p)}
                />
              ))}
            </View>
            <Galat pesan={pesan} />
          </ScrollView>
          <View style={s.kakiKolom}>
            <Text style={s.teks}>
              Total terpilih <Text style={s.tebal}>{total} mnt</Text>
              {estimasiAsal != null ? ` (estimasi topik ${estimasiAsal} mnt)` : ""}
            </Text>
            <View style={s.barisTombol}>
              <Tombol label="Pecah ulang" nonaktif={sibuk} onPress={kosongkan} />
              <Tombol
                label={
                  sibuk ? "Menyimpan..." : `Simpan ${dipilih.length} sub topik`
                }
                utama
                nonaktif={sibuk || dipilih.length === 0}
                onPress={simpan}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            {sibuk ? (
              <SedangMemuat teks="AI sedang memecah topik. Ini bisa memakan waktu sampai satu menit, jangan tutup layar ini." />
            ) : (
              <Langkah daftar={langkahAwal} />
            )}
            <Galat pesan={pesan} />
          </ScrollView>
          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={sibuk} onPress={tutup} />
            <Tombol
              label={sibuk ? "Memecah..." : "Pecahkan"}
              utama
              nonaktif={sibuk}
              onPress={pecah}
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
  subForm: { marginTop: 2, fontSize: 14, lineHeight: 20, color: C.mist },
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
  ket: { fontSize: 13, lineHeight: 19, color: C.mist },
  tebal: { fontSize: 14, fontWeight: "600", color: C.snow },

  langkah: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nomorLangkah: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(50,217,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  teksNomorLangkah: { fontSize: 12, fontWeight: "600", color: C.aqua },
  teksLangkah: { flex: 1, fontSize: 14, lineHeight: 20, color: C.mist },

  memuat: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  teksMemuat: {
    fontSize: 14,
    lineHeight: 20,
    color: C.mist,
    textAlign: "center",
  },

  kotakInfo: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(8,11,22,0.6)",
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
  kakiKolom: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  barisTombol: { flexDirection: "row", gap: 12 },
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