import { useEffect, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import type { HasilBelajar, MasukanSesi } from "../../lib/belajar-aksi";
import type { OpsiTopikSesi } from "../../lib/belajar-detail";
import { formatMenit } from "../../lib/format";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";
import { PilihJam, PilihTanggal } from "../tugas/pemilih";
import { IkonBawah, IkonSilang, IkonTanda } from "./ikon";

export type SesiForm = {
  id: string;
  topic_id: string | null;
  session_date: string;
  start_time: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  status: string;
  notes: string | null;
};

export type KonfigFormSesi =
  | { mode: "tambah" }
  | { mode: "edit"; sesi: SesiForm; namaTopikSekarang: string | null };

type Pilihan = { nilai: string; label: string; grup: string | null };

const JENIS = [
  { nilai: "rencana", label: "Rencanakan sesi" },
  { nilai: "catat", label: "Catat sesi yang sudah selesai" },
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
export default function FormSesi({
  konfig,
  topik,
  hariIni,
  onTutup,
  onSimpan,
}: {
  konfig: KonfigFormSesi | null;
  topik: OpsiTopikSesi[];
  hariIni: string;
  onTutup: () => void;
  onSimpan: (n: MasukanSesi) => Promise<HasilBelajar>;
}) {
  // "kini" menyimpan konfig terakhir supaya isi panel tetap ada saat animasi tutup
  const [kini, setKini] = useState<KonfigFormSesi | null>(konfig);
  const data = konfig ?? kini;
  const edit = data?.mode === "edit";

  const [jenis, setJenis] = useState<"rencana" | "catat">("rencana");
  const [topikDipilih, setTopikDipilih] = useState("");
  const [bukaTopik, setBukaTopik] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni);
  const [pakaiJam, setPakaiJam] = useState(false);
  const [jam, setJam] = useState("");
  const [menit, setMenit] = useState("");
  const [catatan, setCatatan] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const menitManual = useRef(false);

  // Isi form dari konfig setiap kali panel dibuka
  useEffect(() => {
    if (!konfig) return;
    setKini(konfig);
    if (konfig.mode === "edit") {
      const x = konfig.sesi;
      const m = x.status === "done" ? x.actual_minutes : x.planned_minutes;
      setTopikDipilih(x.topic_id ?? "");
      setTanggal(x.session_date);
      setPakaiJam(!!x.start_time);
      setJam(x.start_time ? x.start_time.slice(0, 5) : "");
      setMenit(m != null ? String(m) : "");
      setCatatan(x.notes ?? "");
    } else {
      setTopikDipilih("");
      setTanggal(hariIni);
      setPakaiJam(false);
      setJam("");
      setMenit("");
      setCatatan("");
    }
    setJenis("rencana");
    setBukaTopik(false);
    setGalat(null);
    setProses(false);
    menitManual.current = false;
  }, [konfig, hariIni]);

  // Susun pilihan topik; sub topik membawa nama topik induknya sebagai "grup"
  const pilihan: Pilihan[] = [{ nilai: "", label: "Tanpa topik", grup: null }];
  const topikAwal = data?.mode === "edit" ? (data.sesi.topic_id ?? "") : "";
  if (topikAwal && !topik.some((o) => o.id === topikAwal)) {
    pilihan.push({
      nilai: topikAwal,
      label:
        (data?.mode === "edit" ? data.namaTopikSekarang : null) ??
        "Topik saat ini",
      grup: null,
    });
  }
  for (const o of topik) {
    pilihan.push({ nilai: o.id, label: o.title, grup: o.grup });
  }
  const terpilihPilihan = pilihan.find((p) => p.nilai === topikDipilih);
  const teksTerpilih = terpilihPilihan
    ? terpilihPilihan.grup
      ? `${terpilihPilihan.grup} › ${terpilihPilihan.label}`
      : terpilihPilihan.label
    : "Tanpa topik";

  const terpilih = topik.find((o) => o.id === topikDipilih);
  const sisa =
    terpilih && terpilih.estimasi != null
      ? terpilih.estimasi - terpilih.dipelajari
      : null;

  // Pilih topik: durasi terisi dari sisa estimasi (hanya saat menambah sesi,
  // dan hanya kalau durasi belum diketik sendiri)
  function gantiTopik(id: string) {
    setTopikDipilih(id);
    setBukaTopik(false);
    if (edit || menitManual.current) return;
    const o = topik.find((x) => x.id === id);
    if (o && o.estimasi != null) {
      const sisaO = o.estimasi - o.dipelajari;
      setMenit(sisaO > 0 ? String(Math.min(sisaO, 1440)) : "");
    } else {
      setMenit("");
    }
  }

  function tutup() {
    if (proses) return;
    onTutup();
  }

  async function simpan() {
    if (proses) return;
    if (pakaiJam && !jam) {
      setGalat("Pilih jam sesi, atau matikan pilihan jam.");
      return;
    }
    setProses(true);
    setGalat(null);
    try {
      const hasil = await onSimpan({
        jenis,
        topik: topikDipilih,
        tanggal,
        jam: pakaiJam ? jam : "",
        menit: menit.trim(),
        catatan: catatan.trim(),
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
          <Text style={s.judulForm}>
            {edit ? "Edit sesi belajar" : "Tambah sesi belajar"}
          </Text>
          <Text style={s.subForm}>
            {edit ? "Ubah detail lalu simpan." : "Rencanakan atau catat sesimu."}
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
        {!edit ? (
          <View>
            <Text style={s.label}>Jenis sesi</Text>
            <View style={s.daftarJenis}>
              {JENIS.map((o) => {
                const aktif = jenis === o.nilai;
                return (
                  <Pressable
                    key={o.nilai}
                    onPress={() => setJenis(o.nilai)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: aktif }}
                    style={[s.opsiJenis, aktif && s.opsiJenisAktif]}
                  >
                    <View style={[s.radio, aktif && s.radioAktif]} />
                    <Text style={s.teksJenis}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View>
          <Text style={s.label}>Topik (opsional)</Text>
          <Pressable
            onPress={() => setBukaTopik(!bukaTopik)}
            accessibilityRole="button"
            accessibilityState={{ expanded: bukaTopik }}
            style={s.pemilihTopik}
          >
            <Text style={s.teksPemilih} numberOfLines={2}>
              {teksTerpilih}
            </Text>
            <View
              style={{ transform: [{ rotate: bukaTopik ? "180deg" : "0deg" }] }}
            >
              <IkonBawah warna={C.mist} ukuran={18} />
            </View>
          </Pressable>

          {bukaTopik ? (
            <View style={s.daftarTopik}>
              {pilihan.map((p, i) => {
                const grupBaru = !!p.grup && p.grup !== pilihan[i - 1]?.grup;
                const aktif = p.nilai === topikDipilih;
                return (
                  <View key={p.nilai || "kosong"}>
                    {grupBaru ? <Text style={s.grup}>{p.grup}</Text> : null}
                    <Pressable
                      onPress={() => gantiTopik(p.nilai)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: aktif }}
                      style={s.opsiTopik}
                    >
                      <Text
                        style={[s.teksOpsi, aktif && { color: C.aqua }]}
                        numberOfLines={2}
                      >
                        {p.label}
                      </Text>
                      {aktif ? <IkonTanda warna={C.aqua} ukuran={16} /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <PilihTanggal label="Tanggal" value={tanggal} onChange={setTanggal} />

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

        <View>
          <Text style={s.label}>Durasi (menit)</Text>
          <TextInput
            value={menit}
            onChangeText={(v) => {
              menitManual.current = true;
              setMenit(v);
            }}
            maxLength={4}
            keyboardType="number-pad"
            placeholder="Contoh: 45"
            placeholderTextColor={C.mist}
            returnKeyType="done"
            style={s.input}
          />
          {terpilih && terpilih.estimasi != null ? (
            <Text style={[s.petunjuk, { marginTop: 6 }]}>
              Estimasi {formatMenit(terpilih.estimasi)}, sudah dipelajari{" "}
              {formatMenit(terpilih.dipelajari)}.{" "}
              {sisa !== null && sisa > 0
                ? `Sisa ${formatMenit(sisa)}.`
                : "Estimasi sudah terpenuhi, isi durasi sendiri."}
            </Text>
          ) : null}
        </View>

        <View>
          <Text style={s.label}>Catatan (opsional)</Text>
          <TextInput
            value={catatan}
            onChangeText={setCatatan}
            maxLength={1000}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Apa yang dipelajari atau ingin dilanjutkan?"
            placeholderTextColor={C.mist}
            style={[s.input, { minHeight: 88 }]}
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
  daftarJenis: { marginTop: 6, gap: 8 },
  opsiJenis: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  opsiJenisAktif: { borderColor: C.aqua },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.mist,
  },
  radioAktif: { borderColor: C.aqua, backgroundColor: C.aqua },
  teksJenis: { fontSize: 14, color: C.snow },
  pemilihTopik: {
    marginTop: 6,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  teksPemilih: { flex: 1, fontSize: 14, color: C.snow },
  daftarTopik: {
    marginTop: 8,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  grup: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: C.mist,
  },
  opsiTopik: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  teksOpsi: { flex: 1, fontSize: 14, color: C.snow },
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