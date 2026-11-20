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
import type { HasilBelajar, MasukanTopik } from "../../lib/belajar-aksi";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";
import { PilihJam, PilihTanggal } from "../tugas/pemilih";
import { IkonSilang } from "./ikon";

export type KonfigFormTopik =
  | { mode: "tambah" }
  | {
      mode: "sub";
      induk: { id: string; judul: string; estimasiSendiri: number | null };
    }
  | {
      mode: "edit";
      topik: { id: string; title: string; estimated_minutes: number | null };
      punyaAnak: boolean;
      subtopik: boolean;
    };

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

// konfig null = tertutup. Mode ditentukan oleh isi konfig (tambah / sub / edit).
export default function FormTopik({
  konfig,
  hariIni,
  onTutup,
  onSimpan,
}: {
  konfig: KonfigFormTopik | null;
  hariIni: string;
  onTutup: () => void;
  onSimpan: (n: MasukanTopik) => Promise<HasilBelajar>;
}) {
  // "kini" menyimpan konfig terakhir supaya isi panel tetap ada saat animasi tutup
  const [kini, setKini] = useState<KonfigFormTopik | null>(konfig);
  const data = konfig ?? kini;

  const [judul, setJudul] = useState("");
  const [menit, setMenit] = useState("");
  const [jadwalkan, setJadwalkan] = useState(false);
  const [pakaiJam, setPakaiJam] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [jam, setJam] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Isi form dari konfig setiap kali panel dibuka
  useEffect(() => {
    if (!konfig) return;
    setKini(konfig);
    setJudul(konfig.mode === "edit" ? konfig.topik.title : "");
    setMenit(
      konfig.mode === "edit" && konfig.topik.estimated_minutes != null
        ? String(konfig.topik.estimated_minutes)
        : ""
    );
    setJadwalkan(false);
    setPakaiJam(false);
    setTanggal(hariIni);
    setJam("");
    setGalat(null);
    setProses(false);
  }, [konfig, hariIni]);

  const edit = data?.mode === "edit";
  const punyaAnak = data?.mode === "edit" && data.punyaAnak;

  const judulForm = !data
    ? ""
    : data.mode === "tambah"
      ? "Tambah topik"
      : data.mode === "sub"
        ? "Tambah sub topik"
        : data.subtopik
          ? "Edit sub topik"
          : "Edit topik";
  const subForm =
    data?.mode === "sub"
      ? `Di dalam topik "${data.induk.judul}".`
      : edit
        ? "Ubah detail lalu simpan."
        : "Isi detail topik barumu.";

  function tutup() {
    if (proses) return;
    onTutup();
  }

  async function simpan() {
    if (proses) return;
    if (!edit && jadwalkan && pakaiJam && !jam) {
      setGalat("Pilih jam belajar, atau matikan pilihan jam.");
      return;
    }
    setProses(true);
    setGalat(null);
    try {
      const hasil = await onSimpan({
        judul: judul.trim(),
        menit: menit.trim(),
        tanggal: !edit && jadwalkan ? tanggal : "",
        jam: !edit && jadwalkan && pakaiJam ? jam : "",
      });
      if (hasil.ok) onTutup();
      else setGalat(hasil.pesan);
    } catch {
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(false);
    }
  }

  return (
    <LembarBawah terbuka={konfig !== null} onTutup={tutup}>
      <View style={s.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={s.judulForm}>{judulForm}</Text>
          <Text style={s.subForm}>{subForm}</Text>
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
          <Text style={s.label}>Judul</Text>
          <TextInput
            value={judul}
            onChangeText={setJudul}
            maxLength={120}
            placeholder="Contoh: Dasar Python untuk AI"
            placeholderTextColor={C.mist}
            returnKeyType="done"
            style={s.input}
          />
        </View>

        {punyaAnak ? (
          <Text style={s.petunjuk}>
            Estimasi topik ini dihitung otomatis dari total sub topiknya.
          </Text>
        ) : (
          <View>
            <Text style={s.label}>Estimasi belajar (menit)</Text>
            <TextInput
              value={menit}
              onChangeText={setMenit}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="Contoh: 120"
              placeholderTextColor={C.mist}
              returnKeyType="done"
              style={s.input}
            />
            {data?.mode === "sub" && data.induk.estimasiSendiri != null ? (
              <Text style={[s.petunjuk, { marginTop: 6 }]}>
                Setelah punya sub topik, estimasi topik induk dihitung dari
                total sub topiknya.
              </Text>
            ) : null}
          </View>
        )}

        {!edit ? (
          <>
            <View style={s.barisSwitch}>
              <Text style={s.labelSwitch}>Jadwalkan sesi belajar</Text>
              <Switch
                value={jadwalkan}
                onValueChange={setJadwalkan}
                trackColor={{ false: C.line, true: C.aqua }}
                thumbColor={C.snow}
              />
            </View>

            {jadwalkan ? (
              <>
                <PilihTanggal
                  label="Tanggal belajar"
                  value={tanggal}
                  onChange={setTanggal}
                />
                <View style={s.barisSwitch}>
                  <Text style={s.labelSwitch}>Tentukan jam</Text>
                  <Switch
                    value={pakaiJam}
                    onValueChange={setPakaiJam}
                    trackColor={{ false: C.line, true: C.aqua }}
                    thumbColor={C.snow}
                  />
                </View>
                {pakaiJam ? (
                  <PilihJam label="Jam mulai" value={jam} onChange={setJam} />
                ) : null}
                <Text style={s.petunjuk}>
                  Durasi sesi mengikuti estimasi menit di atas (wajib diisi).
                </Text>
              </>
            ) : null}
          </>
        ) : null}

        {galat ? (
          <Text accessibilityRole="alert" style={s.galat}>
            {galat}
          </Text>
        ) : null}
      </ScrollView>

      <View style={s.kaki}>
        <Tombol label="Batal" nonaktif={proses} onPress={tutup} />
        <Tombol
          label={proses ? "Menyimpan..." : "Simpan"}
          utama
          nonaktif={proses}
          onPress={simpan}
        />
      </View>
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
  petunjuk: { fontSize: 12, lineHeight: 17, color: C.mist },
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