import { useState } from "react";
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
    periksaTugas,
    type HasilUbah,
    type MasukanTugas,
    type TugasItem,
} from "../../lib/tugas";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "./lembar-bawah";
import { PilihJam, PilihPrioritas, PilihTanggal } from "./pemilih";

// Jam dari database bisa berbentuk "HH:MM:SS", form memakai "HH:MM"
const potongJam = (j: string | null | undefined) => (j ? j.slice(0, 5) : "");

function nilaiAwal(t?: TugasItem | null) {
  return {
    judul: t?.title ?? "",
    mulaiTanggal: t?.start_date ?? "",
    mulaiJam: potongJam(t?.start_time),
    selesaiTanggal: t?.due_date ?? "",
    selesaiJam: potongJam(t?.due_time),
    prioritas: t?.priority ?? "medium",
  };
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

// Tanpa prop "tugas" = mode tambah. Dengan prop "tugas" = mode edit.
export default function FormTugas({
  terbuka,
  onTutup,
  onSelesaiTutup,
  onSimpan,
  tugas,
}: {
  terbuka: boolean;
  onTutup: () => void;
  onSelesaiTutup?: () => void;
  onSimpan: (n: MasukanTugas) => Promise<HasilUbah>;
  tugas?: TugasItem;
}) {
  const edit = !!tugas;
  const awal = nilaiAwal(tugas);

  const [judul, setJudul] = useState(awal.judul);
  const [mulaiTanggal, setMulaiTanggal] = useState(awal.mulaiTanggal);
  const [mulaiJam, setMulaiJam] = useState(awal.mulaiJam);
  const [selesaiTanggal, setSelesaiTanggal] = useState(awal.selesaiTanggal);
  const [selesaiJam, setSelesaiJam] = useState(awal.selesaiJam);
  const [prioritas, setPrioritas] = useState(awal.prioritas);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Dikembalikan ke nilai awal setelah panel selesai menutup
  function reset() {
    const a = nilaiAwal(tugas);
    setJudul(a.judul);
    setMulaiTanggal(a.mulaiTanggal);
    setMulaiJam(a.mulaiJam);
    setSelesaiTanggal(a.selesaiTanggal);
    setSelesaiJam(a.selesaiJam);
    setPrioritas(a.prioritas);
    setKonfirmasi(false);
    setProses(false);
    setGalat(null);
    onSelesaiTutup?.();
  }

  const ambil = (): MasukanTugas => ({
    judul: judul.trim(),
    prioritas,
    mulaiTanggal,
    mulaiJam,
    selesaiTanggal,
    selesaiJam,
  });

  function tutup() {
    if (proses) return;
    onTutup();
  }

  function periksa() {
    const salah = periksaTugas(ambil());
    if (salah) {
      setGalat(salah);
      return;
    }
    setGalat(null);
    setKonfirmasi(true);
  }

  async function simpan() {
    if (proses) return;
    setProses(true);
    const hasil = await onSimpan(ambil());
    setProses(false);
    if (hasil.ok) {
      onTutup();
    } else {
      setKonfirmasi(false);
      setGalat(hasil.bentrok ? `Jadwal bentrok. ${hasil.pesan}` : hasil.pesan);
    }
  }

  return (
    <LembarBawah terbuka={terbuka} onTutup={tutup} onSelesaiTutup={reset}>
      {/* Kepala */}
      <View style={s.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={s.judulForm}>
            {konfirmasi
              ? edit
                ? "Yakin ingin menyimpan perubahan?"
                : "Yakin ingin menambah tugas?"
              : edit
                ? "Edit tugas"
                : "Tambah tugas"}
          </Text>
          {!konfirmasi ? (
            <Text style={s.subForm}>
              {edit
                ? "Ubah detail tugas lalu simpan."
                : "Isi detail tugas barumu."}
            </Text>
          ) : null}
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

      {konfirmasi ? (
        <>
          <View style={s.isi}>
            <Text style={s.teksKonfirmasi}>
              {edit
                ? `Perubahan pada tugas "${judul.trim()}" akan disimpan.`
                : `Tugas "${judul.trim()}" akan ditambahkan ke daftarmu.`}
            </Text>
          </View>
          <View style={s.kaki}>
            <Tombol
              label="Batal"
              nonaktif={proses}
              onPress={() => setKonfirmasi(false)}
            />
            <Tombol
              label={
                proses ? "Menyimpan..." : edit ? "Ya, simpan" : "Ya, tambah"
              }
              utama
              nonaktif={proses}
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
            <View>
              <Text style={s.label}>Judul</Text>
              <TextInput
                value={judul}
                onChangeText={setJudul}
                maxLength={200}
                placeholder="Contoh: Kerjakan tugas basis data"
                placeholderTextColor={C.mist}
                returnKeyType="done"
                style={s.input}
              />
            </View>

            <View style={s.baris}>
              <PilihTanggal
                label="Tanggal mulai"
                value={mulaiTanggal}
                onChange={setMulaiTanggal}
              />
              <PilihJam
                label="Jam mulai"
                value={mulaiJam}
                onChange={setMulaiJam}
              />
            </View>

            <View style={s.baris}>
              <PilihTanggal
                label="Tanggal selesai"
                value={selesaiTanggal}
                onChange={setSelesaiTanggal}
              />
              <PilihJam
                label="Jam selesai"
                value={selesaiJam}
                onChange={setSelesaiJam}
              />
            </View>

            <PilihPrioritas value={prioritas} onChange={setPrioritas} />

            {galat ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {galat}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol label="Batal" onPress={tutup} />
            <Tombol label="Simpan" utama onPress={periksa} />
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
  isi: { padding: 20, gap: 16 },
  label: { fontSize: 13, color: C.mist },
  input: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.snow,
  },
  baris: { flexDirection: "row", gap: 12 },
  galat: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 13,
    lineHeight: 18,
    color: C.snow,
  },
  teksKonfirmasi: { fontSize: 14, lineHeight: 20, color: C.mist },
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