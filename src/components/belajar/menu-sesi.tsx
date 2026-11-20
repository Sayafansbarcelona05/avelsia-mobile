import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { HasilBelajar } from "../../lib/belajar-aksi";
import { C, TagTitik } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";

export type KelolaSesi = {
  id: string;
  ringkas: string; // "9 Nov 2026 · Dasar Python"
  status: string; // planned | running | done | skipped
  adaJeda: boolean; // planned tapi sudah pernah berjalan
  topic_id: string | null;
  session_date: string;
  start_time: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  notes: string | null;
  namaTopik: string | null;
};

type Gaya = "utama" | "garis" | "teks";

function labelStatus(k: KelolaSesi) {
  if (k.status === "planned") return k.adaJeda ? "Dijeda" : "Direncanakan";
  if (k.status === "running") return "Sedang berjalan";
  if (k.status === "done") return "Selesai";
  return "Dilewati";
}

function warnaStatus(status: string) {
  if (status === "done") return C.aqua;
  if (status === "running") return C.lilac;
  if (status === "planned") return C.brand;
  return C.mist;
}

function Tombol({
  label,
  gaya,
  memuat,
  nonaktif,
  onPress,
}: {
  label: string;
  gaya: Gaya;
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

export default function MenuSesi({
  konfig,
  onTutup,
  onSelesaiTutup,
  onUbahStatus,
  onHapus,
  onEdit,
}: {
  konfig: KelolaSesi | null;
  onTutup: () => void;
  onSelesaiTutup?: () => void; // dipanggil setelah panel selesai menutup
  onUbahStatus: (
    id: string,
    status: "planned" | "skipped"
  ) => Promise<HasilBelajar>;
  onHapus: (id: string) => Promise<HasilBelajar>;
  onEdit: (k: KelolaSesi) => void;
}) {
  // "item" menyimpan sesi terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<KelolaSesi | null>(konfig);
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  useEffect(() => {
    if (konfig) setItem(konfig);
  }, [konfig]);

  const data = konfig ?? item;

  function tutup() {
    if (proses) return;
    onTutup();
  }

  // Dikosongkan setelah panel selesai menutup
  function reset() {
    setItem(null);
    setProses(null);
    setGalat(null);
    setKonfirmasiHapus(false);
    onSelesaiTutup?.();
  }

  async function jalankan(kunci: string, fn: () => Promise<HasilBelajar>) {
    if (!data || proses) return;
    setProses(kunci);
    setGalat(null);
    try {
      const hasil = await fn();
      if (hasil.ok) onTutup();
      else setGalat(hasil.pesan);
    } catch {
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(null);
    }
  }

  return (
    <LembarBawah terbuka={konfig !== null} onTutup={tutup} onSelesaiTutup={reset}>
      {data ? (
        <View style={s.isi}>
          {konfirmasiHapus ? (
            <>
              <Text style={s.judul}>Hapus sesi ini?</Text>
              <Text style={s.teksKonfirmasi}>
                Sesi &quot;{data.ringkas}&quot; akan dihapus permanen, termasuk
                waktu belajar yang tercatat di dalamnya.
              </Text>

              {galat ? <Text style={s.galat}>{galat}</Text> : null}

              <View style={s.aksi}>
                <Tombol
                  label="Ya, hapus"
                  gaya="utama"
                  memuat={proses === "hapus"}
                  nonaktif={proses !== null}
                  onPress={() => jalankan("hapus", () => onHapus(data.id))}
                />
                <Tombol
                  label="Batal"
                  gaya="garis"
                  nonaktif={proses !== null}
                  onPress={() => {
                    setGalat(null);
                    setKonfirmasiHapus(false);
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={s.judul} numberOfLines={3}>
                {data.ringkas}
              </Text>
              <View style={s.tag}>
                <TagTitik
                  label={labelStatus(data)}
                  warna={warnaStatus(data.status)}
                />
              </View>

              {galat ? <Text style={s.galat}>{galat}</Text> : null}

              <View style={s.aksi}>
                {data.status === "running" ? (
                  <Text style={s.teksKonfirmasi}>
                    Sesi sedang berjalan. Jeda atau selesaikan dulu lewat
                    timer sebelum mengelolanya.
                  </Text>
                ) : (
                  <>
                    {data.status === "planned" ? (
                      <Tombol
                        label="Lewati sesi"
                        gaya="garis"
                        memuat={proses === "lewati"}
                        nonaktif={proses !== null}
                        onPress={() =>
                          jalankan("lewati", () =>
                            onUbahStatus(data.id, "skipped")
                          )
                        }
                      />
                    ) : null}
                    {data.status === "skipped" ? (
                      <Tombol
                        label="Rencanakan lagi"
                        gaya="utama"
                        memuat={proses === "rencana"}
                        nonaktif={proses !== null}
                        onPress={() =>
                          jalankan("rencana", () =>
                            onUbahStatus(data.id, "planned")
                          )
                        }
                      />
                    ) : null}
                    <Tombol
                      label="Edit sesi"
                      gaya="garis"
                      nonaktif={proses !== null}
                      onPress={() => onEdit(data)}
                    />
                    <Tombol
                      label="Hapus sesi"
                      gaya="garis"
                      nonaktif={proses !== null}
                      onPress={() => {
                        setGalat(null);
                        setKonfirmasiHapus(true);
                      }}
                    />
                  </>
                )}
                <Tombol
                  label="Tutup"
                  gaya="teks"
                  nonaktif={proses !== null}
                  onPress={tutup}
                />
              </View>
            </>
          )}
        </View>
      ) : null}
    </LembarBawah>
  );
}

const s = StyleSheet.create({
  isi: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  judul: { fontSize: 18, fontWeight: "600", lineHeight: 24, color: C.snow },
  teksKonfirmasi: { marginTop: 8, fontSize: 14, lineHeight: 20, color: C.mist },
  tag: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galat: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    fontSize: 13,
    lineHeight: 18,
    color: C.snow,
  },
  aksi: { marginTop: 20, gap: 10 },
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
  teksTombol: { fontSize: 14, fontWeight: "600" },
});