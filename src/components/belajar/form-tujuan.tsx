import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import type { HasilBelajar, MasukanTujuan } from "../../lib/belajar-aksi";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";
import { PilihTanggal } from "../tugas/pemilih";
import { IkonSilang } from "./ikon";

export type KonfigFormTujuan =
  | { mode: "tambah" }
  | {
      mode: "edit";
      tujuan: {
        id: string;
        title: string;
        target_outcome: string | null;
        target_date: string | null;
        starting_level: string | null;
        weekly_minutes: number | null;
        completion_criteria: string | null;
      };
    };

const OPSI_LEVEL = [
  { nilai: "pemula", label: "Pemula" },
  { nilai: "menengah", label: "Menengah" },
  { nilai: "mahir", label: "Mahir" },
] as const;

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

// konfig null = tertutup. Mode ditentukan oleh isi konfig (tambah / edit).
export default function FormTujuan({
  konfig,
  hariIni,
  onTutup,
  onSimpan,
}: {
  konfig: KonfigFormTujuan | null;
  hariIni: string;
  onTutup: () => void;
  onSimpan: (n: MasukanTujuan) => Promise<HasilBelajar>;
}) {
  // "kini" menyimpan konfig terakhir supaya isi panel tetap ada saat animasi tutup
  const [kini, setKini] = useState<KonfigFormTujuan | null>(konfig);
  const data = konfig ?? kini;

  const [judul, setJudul] = useState("");
  const [target, setTarget] = useState("");
  const [pakaiTanggal, setPakaiTanggal] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [level, setLevel] = useState<string>("pemula");
  const [menit, setMenit] = useState("");
  const [kriteria, setKriteria] = useState("");
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Isi form dari konfig setiap kali panel dibuka
  useEffect(() => {
    if (!konfig) return;
    setKini(konfig);
    const t = konfig.mode === "edit" ? konfig.tujuan : null;
    setJudul(t?.title ?? "");
    setTarget(t?.target_outcome ?? "");
    setPakaiTanggal(!!t?.target_date);
    setTanggal(t?.target_date ?? hariIni);
    setLevel(t?.starting_level ?? "pemula");
    setMenit(t?.weekly_minutes != null ? String(t.weekly_minutes) : "");
    setKriteria(t?.completion_criteria ?? "");
    setKonfirmasi(false);
    setGalat(null);
    setProses(false);
  }, [konfig, hariIni]);

  const edit = data?.mode === "edit";
  const judulBersih = judul.trim();

  function tutup() {
    if (proses) return;
    onTutup();
  }

  function mintaKonfirmasi() {
    if (proses) return;
    if (judulBersih.length < 1) {
      setGalat("Judul wajib diisi, maksimal 120 karakter.");
      return;
    }
    setGalat(null);
    setKonfirmasi(true);
  }

  async function lanjutkan() {
    if (proses || !data) return;
    setProses(true);
    setGalat(null);
    try {
      const hasil = await onSimpan({
        judul: judulBersih,
        target: target.trim(),
        tanggal: pakaiTanggal ? tanggal : "",
        level,
        menit: menit.trim(),
        kriteria: kriteria.trim(),
      });
      if (hasil.ok) {
        onTutup();
      } else {
        setGalat(hasil.pesan);
        setKonfirmasi(false);
      }
    } catch {
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
      setKonfirmasi(false);
    } finally {
      setProses(false);
    }
  }

  return (
    <LembarBawah terbuka={konfig !== null} onTutup={tutup}>
      {konfirmasi ? (
        <View style={s.konfirmasi}>
          <Text style={s.judulForm}>
            {edit
              ? "Yakin ingin menyimpan perubahan?"
              : "Yakin ingin menambah tujuan?"}
          </Text>
          <Text style={s.teksKonfirmasi}>
            {edit
              ? `Perubahan pada tujuan "${judulBersih}" akan disimpan.`
              : `Tujuan "${judulBersih}" akan ditambahkan ke daftarmu.`}
          </Text>
          <View style={s.kakiKonfirmasi}>
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
              onPress={lanjutkan}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={s.kepala}>
            <View style={{ flex: 1 }}>
              <Text style={s.judulForm}>
                {edit ? "Edit tujuan belajar" : "Tambah tujuan belajar"}
              </Text>
              <Text style={s.subForm}>
                {edit
                  ? "Ubah detail tujuan lalu simpan."
                  : "Apa yang ingin kamu kuasai?"}
              </Text>
            </View>
            <Pressable
              onPress={tutup}
              accessibilityRole="button"
              accessibilityLabel="Tutup panel"
              style={s.tombolTutup}
            >
              <IkonSilang warna={C.mist} ukuran={16} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={s.isi}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={s.label}>Judul tujuan</Text>
              <TextInput
                value={judul}
                onChangeText={setJudul}
                maxLength={120}
                placeholder="Contoh: Menguasai TypeScript"
                placeholderTextColor={C.mist}
                returnKeyType="done"
                style={s.input}
              />
            </View>

            <View>
              <Text style={s.label}>Target hasil (opsional)</Text>
              <TextInput
                value={target}
                onChangeText={setTarget}
                maxLength={500}
                multiline
                placeholder="Contoh: Bisa membuat aplikasi sendiri tanpa tutorial"
                placeholderTextColor={C.mist}
                textAlignVertical="top"
                style={[s.input, s.inputBanyak]}
              />
            </View>

            <View style={s.barisSwitch}>
              <Text style={s.labelSwitch}>Tentukan tanggal target</Text>
              <Switch
                value={pakaiTanggal}
                onValueChange={setPakaiTanggal}
                trackColor={{ false: C.line, true: C.aqua }}
                thumbColor={C.snow}
              />
            </View>
            {pakaiTanggal ? (
              <PilihTanggal
                label="Tanggal target"
                value={tanggal}
                onChange={setTanggal}
              />
            ) : null}

            <View>
              <Text style={s.label}>Level awal</Text>
              <View style={s.barisLevel}>
                {OPSI_LEVEL.map((o) => {
                  const on = level === o.nilai;
                  return (
                    <Pressable
                      key={o.nilai}
                      onPress={() => setLevel(o.nilai)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={[s.pilihLevel, on && s.pilihLevelOn]}
                    >
                      <Text
                        style={[
                          s.teksLevel,
                          { color: on ? C.ink : C.snow },
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={s.label}>Menit belajar per minggu (opsional)</Text>
              <TextInput
                value={menit}
                onChangeText={setMenit}
                maxLength={5}
                keyboardType="number-pad"
                placeholder="Contoh: 300 (5 jam per minggu)"
                placeholderTextColor={C.mist}
                returnKeyType="done"
                style={s.input}
              />
            </View>

            <View>
              <Text style={s.label}>Kriteria selesai (opsional)</Text>
              <TextInput
                value={kriteria}
                onChangeText={setKriteria}
                maxLength={500}
                multiline
                placeholder="Contoh: Lulus 3 proyek latihan"
                placeholderTextColor={C.mist}
                textAlignVertical="top"
                style={[s.input, s.inputBanyak]}
              />
            </View>

            {galat ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {galat}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Tombol label="Batal" nonaktif={proses} onPress={tutup} />
            <Tombol
              label="Simpan"
              utama
              nonaktif={proses}
              onPress={mintaKonfirmasi}
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
  inputBanyak: { minHeight: 84, maxHeight: 140 },
  barisSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelSwitch: { fontSize: 14, color: C.snow },
  barisLevel: { marginTop: 6, flexDirection: "row", gap: 8 },
  pilihLevel: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  pilihLevelOn: { backgroundColor: C.aqua, borderColor: C.aqua },
  teksLevel: { fontSize: 13, fontWeight: "600" },
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
  konfirmasi: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  teksKonfirmasi: { marginTop: 8, fontSize: 14, lineHeight: 20, color: C.mist },
  kakiKonfirmasi: { marginTop: 20, flexDirection: "row", gap: 12 },
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