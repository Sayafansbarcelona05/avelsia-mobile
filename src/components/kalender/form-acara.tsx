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
import Svg, { Path } from "react-native-svg";
import {
  periksaAcara,
  type AcaraForm,
  type HasilAcara,
  type MasukanAcara,
} from "../../lib/kalender";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";
import { PilihJam, PilihTanggal } from "../tugas/pemilih";

// Jam dari database bisa berbentuk "HH:MM:SS", form memakai "HH:MM"
const potongJam = (j: string | null | undefined) => (j ? j.slice(0, 5) : "");

function nilaiAwal(a?: AcaraForm | null, tanggalAwal?: string) {
  return {
    judul: a?.title ?? "",
    lokasi: a?.location ?? "",
    sepanjangHari: a?.sepanjangHari ?? false,
    mulaiTanggal: a?.mulaiTanggal ?? tanggalAwal ?? "",
    mulaiJam: potongJam(a?.mulaiJam),
    selesaiTanggal: a?.selesaiTanggal ?? tanggalAwal ?? "",
    selesaiJam: potongJam(a?.selesaiJam),
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

// Tanpa prop "acara" = mode tambah. Dengan prop "acara" = mode edit.
export default function FormAcara({
  terbuka,
  onTutup,
  onSelesaiTutup,
  onSimpan,
  tz,
  tanggalAwal,
  acara,
}: {
  terbuka: boolean;
  onTutup: () => void;
  onSelesaiTutup?: () => void;
  onSimpan: (n: MasukanAcara) => Promise<HasilAcara>;
  tz: string;
  tanggalAwal?: string;
  acara?: AcaraForm;
}) {
  const edit = !!acara;
  const awal = nilaiAwal(acara, tanggalAwal);

  const [judul, setJudul] = useState(awal.judul);
  const [lokasi, setLokasi] = useState(awal.lokasi);
  const [sepanjangHari, setSepanjangHari] = useState(awal.sepanjangHari);
  const [mulaiTanggal, setMulaiTanggal] = useState(awal.mulaiTanggal);
  const [mulaiJam, setMulaiJam] = useState(awal.mulaiJam);
  const [selesaiTanggal, setSelesaiTanggal] = useState(awal.selesaiTanggal);
  const [selesaiJam, setSelesaiJam] = useState(awal.selesaiJam);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Mode edit: isi form dari acara yang dipilih setiap kali panel dibuka
  useEffect(() => {
    if (terbuka && acara) {
      const a = nilaiAwal(acara);
      setJudul(a.judul);
      setLokasi(a.lokasi);
      setSepanjangHari(a.sepanjangHari);
      setMulaiTanggal(a.mulaiTanggal);
      setMulaiJam(a.mulaiJam);
      setSelesaiTanggal(a.selesaiTanggal);
      setSelesaiJam(a.selesaiJam);
      setKonfirmasi(false);
      setGalat(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terbuka, acara?.id]);

  // Mode tambah: tanggal awal mengikuti hari yang sedang dipilih di kalender
  useEffect(() => {
    if (terbuka && !edit) {
      setMulaiTanggal(tanggalAwal ?? "");
      setSelesaiTanggal(tanggalAwal ?? "");
    }
  }, [terbuka, edit, tanggalAwal]);

  // Dikembalikan ke nilai awal setelah panel selesai menutup
  function reset() {
    const a = nilaiAwal(acara, tanggalAwal);
    setJudul(a.judul);
    setLokasi(a.lokasi);
    setSepanjangHari(a.sepanjangHari);
    setMulaiTanggal(a.mulaiTanggal);
    setMulaiJam(a.mulaiJam);
    setSelesaiTanggal(a.selesaiTanggal);
    setSelesaiJam(a.selesaiJam);
    setKonfirmasi(false);
    setProses(false);
    setGalat(null);
    onSelesaiTutup?.();
  }

  const ambil = (): MasukanAcara => ({
    judul: judul.trim(),
    lokasi: lokasi.trim(),
    sepanjangHari,
    mulaiTanggal,
    mulaiJam: sepanjangHari ? "" : mulaiJam,
    selesaiTanggal,
    selesaiJam: sepanjangHari ? "" : selesaiJam,
  });

  function tutup() {
    if (proses) return;
    onTutup();
  }

  function periksa() {
    const salah = periksaAcara(ambil(), tz);
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
    try {
      const hasil = await onSimpan(ambil());
      if (hasil.ok) {
        onTutup();
      } else {
        setKonfirmasi(false);
        setGalat(
          hasil.bentrok ? `Jadwal bentrok. ${hasil.pesan}` : hasil.pesan
        );
      }
    } catch {
      setKonfirmasi(false);
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(false);
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
                : "Yakin ingin menambah acara?"
              : edit
                ? "Edit acara"
                : "Tambah acara"}
          </Text>
          {!konfirmasi ? (
            <Text style={s.subForm}>
              {edit
                ? "Ubah detail acara lalu simpan."
                : "Isi detail acara barumu."}
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
                ? `Perubahan pada acara "${judul.trim()}" akan disimpan.`
                : `Acara "${judul.trim()}" akan ditambahkan ke kalendermu.`}
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
                placeholder="Contoh: Rapat dengan dosen"
                placeholderTextColor={C.mist}
                returnKeyType="done"
                style={s.input}
              />
            </View>

            <View>
              <Text style={s.label}>Lokasi (opsional)</Text>
              <TextInput
                value={lokasi}
                onChangeText={setLokasi}
                maxLength={300}
                placeholder="Contoh: Ruang 204"
                placeholderTextColor={C.mist}
                returnKeyType="done"
                style={s.input}
              />
            </View>

            <View style={s.barisSwitch}>
              <Text style={s.labelSwitch}>Sepanjang hari</Text>
              <Switch
                value={sepanjangHari}
                onValueChange={setSepanjangHari}
                trackColor={{ false: C.line, true: C.aqua }}
                thumbColor={C.snow}
              />
            </View>

            <View style={s.baris}>
              <PilihTanggal
                label="Tanggal mulai"
                value={mulaiTanggal}
                onChange={setMulaiTanggal}
              />
              {!sepanjangHari ? (
                <PilihJam
                  label="Jam mulai"
                  value={mulaiJam}
                  onChange={setMulaiJam}
                />
              ) : null}
            </View>

            <View style={s.baris}>
              <PilihTanggal
                label="Tanggal selesai"
                value={selesaiTanggal}
                onChange={setSelesaiTanggal}
              />
              {!sepanjangHari ? (
                <PilihJam
                  label="Jam selesai"
                  value={selesaiJam}
                  onChange={setSelesaiJam}
                />
              ) : null}
            </View>

            <Text style={s.petunjuk}>
              Jam diabaikan jika acara sepanjang hari.
            </Text>

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
  barisSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelSwitch: { fontSize: 14, color: C.snow },
  baris: { flexDirection: "row", gap: 12 },
  petunjuk: { fontSize: 12, color: C.mist },
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