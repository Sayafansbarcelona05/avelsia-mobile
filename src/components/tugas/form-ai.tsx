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
import {
  aktifkanAI,
  simpanUsulan,
  usulkanDariAI,
  type Usulan,
} from "../../lib/ai-tugas";
import { C } from "../dashboard/panel-kartu";
import { toast } from "../toast";
import { LembarBawah } from "./lembar-bawah";

const MAKS = 500;

const CONTOH = [
  "tugas basis data deadline hari ini jam 20.00",
  "besok jam 3 sore rapat dengan dosen di ruang 204",
];

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const LABEL_PRIORITAS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

// Tanggal murni ("2026-11-12") dipecah manual supaya tidak bergeser sehari
function tgl(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  if (!y || !m || !d) return t || "?";
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function waktuAcara(u: Usulan) {
  if (u.sepanjangHari) {
    return u.mulaiTanggal === u.selesaiTanggal
      ? `${tgl(u.mulaiTanggal)} · Sepanjang hari`
      : `${tgl(u.mulaiTanggal)} sampai ${tgl(u.selesaiTanggal)} · Sepanjang hari`;
  }
  if (u.mulaiTanggal === u.selesaiTanggal) {
    return `${tgl(u.mulaiTanggal)}, ${u.mulaiJam} sampai ${u.selesaiJam}`;
  }
  return `${tgl(u.mulaiTanggal)} ${u.mulaiJam} sampai ${tgl(u.selesaiTanggal)} ${u.selesaiJam}`;
}

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
      <Text style={[s.teksTombol, { color: utama ? C.ink : C.snow }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FormAI({
  terbuka,
  onTutup,
  onTersimpan,
}: {
  terbuka: boolean;
  onTutup: () => void;
  onTersimpan: () => void | Promise<void>; // dipanggil setelah ada item yang tersimpan
}) {
  const [teks, setTeks] = useState("");
  const [usulan, setUsulan] = useState<Usulan[] | null>(null);
  const [pesan, setPesan] = useState("");
  const [perluAktif, setPerluAktif] = useState(false);
  const [proses, setProses] = useState(false);
  const tersimpan = useRef(0); // jumlah item tersimpan sejak sheet dibuka

  const layak = (usulan ?? []).filter((u) => !u.masalah && !u.bentrok);

  // Dikembalikan ke awal setelah panel selesai menutup
  function reset() {
    const n = tersimpan.current;
    tersimpan.current = 0;
    setTeks("");
    setUsulan(null);
    setPesan("");
    setPerluAktif(false);
    setProses(false);
    if (n > 0) {
      toast.sukses(n === 1 ? "1 item tersimpan" : `${n} item tersimpan`);
      Promise.resolve(onTersimpan()).catch(() => {});
    }
  }

  function tutup() {
    if (proses) return;
    onTutup();
  }

  async function ajukan() {
    const h = await usulkanDariAI(teks);
    if (!h.ok) {
      setPerluAktif(Boolean(h.perluAktif));
      setPesan(h.perluAktif ? "" : h.pesan);
      return;
    }
    setPerluAktif(false);
    if (h.usulan.length === 0) {
      setUsulan(null);
      setPesan(
        h.catatan ||
          "AI belum menemukan tugas atau acara di kalimatmu. Coba tulis lebih jelas, misalnya: besok jam 3 sore rapat dengan dosen."
      );
      return;
    }
    setUsulan(h.usulan);
  }

  async function prosesKalimat() {
    if (proses) return;
    setPesan("");
    setProses(true);
    await ajukan();
    setProses(false);
  }

  async function aktifkan() {
    if (proses) return;
    setPesan("");
    setProses(true);
    const a = await aktifkanAI();
    if (!a.ok) {
      setPesan(a.pesan);
      setProses(false);
      return;
    }
    setPerluAktif(false);
    await ajukan();
    setProses(false);
  }

  function buang(id: string) {
    setUsulan((awal) => {
      const sisa = (awal ?? []).filter((u) => u.id !== id);
      return sisa.length > 0 ? sisa : null;
    });
  }

  async function simpan() {
    if (!usulan || layak.length === 0 || proses) return;
    setProses(true);
    const h = await simpanUsulan(
      layak.map((u) => ({
        id: u.id,
        jenis: u.jenis,
        judul: u.judul,
        lokasi: u.lokasi,
        prioritas: u.prioritas,
        sepanjangHari: u.sepanjangHari,
        mulaiTanggal: u.mulaiTanggal,
        mulaiJam: u.mulaiJam,
        selesaiTanggal: u.selesaiTanggal,
        selesaiJam: u.selesaiJam,
      }))
    );
    if (h.hasil.length === 0) {
      setPesan(h.pesan);
      setProses(false);
      return;
    }

    const berhasil = new Set(h.hasil.filter((x) => x.ok).map((x) => x.id));
    const gagal = new Map(
      h.hasil.filter((x) => !x.ok).map((x) => [x.id, x.pesan] as const)
    );
    // Toast dan muat ulang daftar dijalankan setelah sheet selesai menutup
    // (lihat reset), supaya animasi tutup tidak tersendat dan toast tidak
    // tertutup sheet.
    tersimpan.current += berhasil.size;
    const sisa = usulan
      .filter((u) => !berhasil.has(u.id))
      .map((u) =>
        gagal.has(u.id) ? { ...u, masalah: gagal.get(u.id) ?? null } : u
      );
    setProses(false);
    if (sisa.length === 0) {
      onTutup();
      return;
    }
    setUsulan(sisa);
    setPesan("");
  }

  return (
    <LembarBawah terbuka={terbuka} onTutup={tutup} onSelesaiTutup={reset}>
      {/* Kepala */}
      <View style={s.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={s.judulForm}>Tambah dengan AI</Text>
          <Text style={s.subForm}>
            {perluAktif
              ? "Aktifkan AI untuk memakai fitur ini."
              : usulan
                ? "Cek dulu sebelum disimpan."
                : "Tulis dengan kalimat biasa."}
          </Text>
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
              Fitur ini memakai Google Gemini. Kalimat yang kamu ketik akan
              dikirim ke Gemini untuk diubah menjadi usulan tugas atau acara.
              Yang dikirim hanya kalimat itu, tanggal dan jam hari ini, serta
              zona waktumu, bukan daftar tugas atau acara yang sudah ada.
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
            <Tombol label="Batal" nonaktif={proses} onPress={tutup} />
            <Tombol
              label={proses ? "Memproses..." : "Aktifkan AI"}
              utama
              nonaktif={proses}
              onPress={aktifkan}
            />
          </View>
        </>
      ) : usulan ? (
        <>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            showsVerticalScrollIndicator={false}
          >
            {usulan.map((u) => {
              const hambatan = u.bentrok ?? u.masalah;
              return (
                <View key={u.id} style={s.kartu}>
                  <View style={s.kartuAtas}>
                    <View style={{ flex: 1 }}>
                      <View style={s.tagJenis}>
                        <View
                          style={[
                            s.titikJenis,
                            u.jenis === "acara"
                              ? { backgroundColor: C.aqua, borderRadius: 4 }
                              : { backgroundColor: C.lilac, borderRadius: 2 },
                          ]}
                        />
                        <Text style={s.teksTagJenis}>
                          {u.jenis === "acara" ? "Acara" : "Tugas"}
                        </Text>
                      </View>
                      <Text style={s.judulKartu}>{u.judul}</Text>

                      {u.jenis === "acara" ? (
                        <>
                          <Text style={s.detail}>{waktuAcara(u)}</Text>
                          {u.lokasi ? (
                            <Text style={s.detail}>{u.lokasi}</Text>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <Text style={s.detail}>
                            Mulai {tgl(u.mulaiTanggal)}, {u.mulaiJam}
                          </Text>
                          <Text style={s.detail}>
                            Tenggat {tgl(u.selesaiTanggal)}, {u.selesaiJam}
                          </Text>
                          <Text style={s.detail}>
                            Prioritas {LABEL_PRIORITAS[u.prioritas]}
                          </Text>
                        </>
                      )}
                    </View>
                    <Pressable
                      onPress={() => buang(u.id)}
                      disabled={proses}
                      accessibilityRole="button"
                      accessibilityLabel={`Buang usulan ${u.judul}`}
                      style={s.tombolBuang}
                    >
                      <Text style={s.teksBuang}>Buang</Text>
                    </Pressable>
                  </View>

                  {u.asumsi.length > 0 ? (
                    <View style={s.kotakAsumsi}>
                      <Text style={s.judulAsumsi}>Asumsi AI</Text>
                      {u.asumsi.map((a, i) => (
                        <Text key={i} style={s.detail}>
                          {"\u2022"} {a}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {hambatan ? (
                    <Text accessibilityRole="alert" style={s.hambatan}>
                      <Text style={{ fontWeight: "600" }}>
                        Tidak bisa disimpan.{" "}
                      </Text>
                      {hambatan}
                    </Text>
                  ) : null}
                </View>
              );
            })}

            {pesan ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {pesan}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol
              label="Ubah kalimat"
              nonaktif={proses}
              onPress={() => {
                setUsulan(null);
                setPesan("");
              }}
            />
            <Tombol
              label={
                proses ? "Menyimpan..." : `Simpan ${layak.length} item`
              }
              utama
              nonaktif={proses || layak.length === 0}
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
            <View style={s.kotakTips}>
              <Text style={s.judulTips}>Tips menulis</Text>
              <Text style={s.itemTips}>
                {"\u2022"} <Text style={s.tebal}>Tugas:</Text> tulis kata
                &quot;tugas&quot; atau &quot;deadline&quot; beserta tanggal dan
                jam tenggatnya.
              </Text>
              <Text style={s.itemTips}>
                {"\u2022"} <Text style={s.tebal}>Acara:</Text> tulis kegiatannya
                (rapat, kuliah, janji) beserta jam mulai. Kalau durasi tidak
                disebut, dianggap 1 jam.
              </Text>
              <Text style={s.itemTips}>
                {"\u2022"} Boleh menulis beberapa sekaligus dalam satu kalimat.
              </Text>
              <Text style={[s.itemTips, { marginTop: 4 }]}>
                Ketuk contoh untuk mencobanya:
              </Text>
              {CONTOH.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setTeks(c)}
                  disabled={proses}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    s.contoh,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={s.teksContoh}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View>
              <TextInput
                value={teks}
                onChangeText={setTeks}
                maxLength={MAKS}
                multiline
                editable={!proses}
                textAlignVertical="top"
                placeholder="Contoh: besok jam 3 sore rapat dengan dosen di ruang 204, dan tugas basis data dikumpulkan Jumat jam 23.59"
                placeholderTextColor={C.mist}
                style={s.input}
              />
              <Text style={s.hitung}>
                {teks.length}/{MAKS}
              </Text>
            </View>
            {pesan ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {pesan}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={proses} onPress={tutup} />
            <Tombol
              label={proses ? "Memproses..." : "Proses"}
              utama
              nonaktif={proses || teks.trim().length < 3}
              onPress={prosesKalimat}
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
  kotakTips: {
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.baris,
  },
  judulTips: { fontSize: 13, fontWeight: "600", color: C.snow },
  itemTips: { fontSize: 13, lineHeight: 19, color: C.mist },
  tebal: { fontWeight: "600", color: C.snow },
  contoh: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  teksContoh: { fontSize: 13, lineHeight: 18, color: C.snow },

  input: {
    minHeight: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: C.snow,
  },
  hitung: { marginTop: 4, textAlign: "right", fontSize: 12, color: C.mist },

  kartu: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.baris,
  },
  kartuAtas: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tagJenis: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  titikJenis: { width: 8, height: 8 },
  teksTagJenis: { fontSize: 12, color: C.mist },
  judulKartu: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: C.snow,
  },
  detail: { marginTop: 4, fontSize: 12, lineHeight: 17, color: C.mist },
  tombolBuang: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  teksBuang: { fontSize: 12, fontWeight: "500", color: C.snow },
  kotakAsumsi: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  judulAsumsi: { fontSize: 12, fontWeight: "600", color: C.snow },
  hambatan: {
    padding: 12,
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
  teksTombol: { fontSize: 14, fontWeight: "600" },
});