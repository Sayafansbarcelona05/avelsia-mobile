import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import type { HasilBelajar } from "../../lib/belajar-aksi";
import type { RefTopik } from "../../lib/belajar-detail";
import type { MasukanReferensi } from "../../lib/referensi-aksi";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";
import { kolom } from "./editor-topik";

export type KonfigFormReferensi =
  | { mode: "tambah"; topicId: string; topikJudul: string }
  | { mode: "edit"; topikJudul: string; referensi: RefTopik };

const OPSI_JENIS = [
  { nilai: "artikel", label: "Artikel" },
  { nilai: "video", label: "Video" },
  { nilai: "buku", label: "Buku" },
  { nilai: "dokumentasi", label: "Dokumentasi" },
  { nilai: "lainnya", label: "Lainnya" },
];

export default function FormReferensi({
  konfig,
  onTutup,
  onSimpan,
}: {
  konfig: KonfigFormReferensi | null;
  onTutup: () => void;
  onSimpan: (n: MasukanReferensi) => Promise<HasilBelajar>;
}) {
  // "item" menyimpan konfigurasi terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<KonfigFormReferensi | null>(konfig);
  const [judul, setJudul] = useState("");
  const [tautan, setTautan] = useState("");
  const [jenis, setJenis] = useState("artikel");
  const [catatan, setCatatan] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Kolom diisi setiap panel dibuka (edit: dari referensi, tambah: kosong)
  useEffect(() => {
    if (!konfig) return;
    setItem(konfig);
    if (konfig.mode === "edit") {
      setJudul(konfig.referensi.title);
      setTautan(konfig.referensi.url ?? "");
      setJenis(konfig.referensi.kind || "artikel");
      setCatatan(konfig.referensi.notes ?? "");
    } else {
      setJudul("");
      setTautan("");
      setJenis("artikel");
      setCatatan("");
    }
    setGalat(null);
  }, [konfig]);

  const data = konfig ?? item;

  function tutup() {
    if (proses) return;
    onTutup();
  }

  function reset() {
    setItem(null);
    setGalat(null);
    setProses(false);
  }

  async function simpan() {
    if (proses) return;
    setProses(true);
    setGalat(null);
    try {
      const h = await onSimpan({ judul, tautan, jenis, catatan });
      if (h.ok) onTutup();
      else setGalat(h.pesan);
    } catch {
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(false);
    }
  }

  return (
    <LembarBawah terbuka={konfig !== null} onTutup={tutup} onSelesaiTutup={reset}>
      {data ? (
        <>
          <View style={s.kepala}>
            <View style={{ flex: 1 }}>
              <Text style={s.judulForm}>
                {data.mode === "edit" ? "Edit referensi" : "Tambah referensi"}
              </Text>
              <Text style={s.subForm} numberOfLines={2}>
                Untuk: {data.topikJudul}
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
                editable={!proses}
                placeholder="Contoh: Dokumentasi resmi TypeScript Generics"
                placeholderTextColor={C.mist}
                style={[kolom, s.kolom]}
              />
            </View>

            <View>
              <Text style={s.label}>Tautan (opsional)</Text>
              <TextInput
                value={tautan}
                onChangeText={setTautan}
                maxLength={2000}
                editable={!proses}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://..."
                placeholderTextColor={C.mist}
                style={[kolom, s.kolom]}
              />
            </View>

            <View>
              <Text style={s.label}>Jenis</Text>
              <View style={s.barisJenis}>
                {OPSI_JENIS.map((o) => {
                  const aktif = jenis === o.nilai;
                  return (
                    <Pressable
                      key={o.nilai}
                      onPress={() => !proses && setJenis(o.nilai)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: aktif }}
                      style={[s.chip, aktif && s.chipAktif]}
                    >
                      <Text
                        style={[s.teksChip, { color: aktif ? C.ink : C.snow }]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={s.label}>Catatan (opsional)</Text>
              <TextInput
                value={catatan}
                onChangeText={setCatatan}
                maxLength={1000}
                editable={!proses}
                multiline
                textAlignVertical="top"
                placeholder="Bagian mana yang perlu dibaca, kenapa berguna..."
                placeholderTextColor={C.mist}
                style={[kolom, s.kolom, { minHeight: 88 }]}
              />
            </View>

            {galat ? (
              <Text accessibilityRole="alert" style={s.galat}>
                {galat}
              </Text>
            ) : null}
          </ScrollView>

          <View style={s.kaki}>
            <Pressable
              onPress={tutup}
              disabled={proses}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.tombol,
                s.tombolGaris,
                proses && { opacity: 0.6 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[s.teksTombol, { color: C.snow }]}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={simpan}
              disabled={proses}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.tombol,
                s.tombolUtama,
                pressed && { opacity: 0.8 },
              ]}
            >
              {proses ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <Text style={[s.teksTombol, { color: C.ink }]}>Simpan</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
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
  isi: { padding: 20, gap: 16 },
  label: { fontSize: 14, color: C.mist },
  kolom: { marginTop: 6 },
  barisJenis: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipAktif: { backgroundColor: C.aqua, borderColor: C.aqua },
  teksChip: { fontSize: 13, fontWeight: "600" },
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