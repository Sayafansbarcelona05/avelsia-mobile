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

export type KelolaTujuan = {
  id: string;
  judul: string;
  status: string; // active | completed | archived
};

type Gaya = "utama" | "garis" | "teks";

const LABEL_STATUS: Record<string, string> = {
  active: "Aktif",
  completed: "Selesai",
  archived: "Diarsipkan",
};
const WARNA_STATUS: Record<string, string> = {
  active: C.aqua,
  completed: C.lilac,
  archived: C.mist,
};

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

export default function MenuTujuan({
  konfig,
  onTutup,
  onSelesaiTutup,
  onUbahStatus,
  onHapus,
  onEdit,
}: {
  konfig: KelolaTujuan | null;
  onTutup: () => void;
  onSelesaiTutup?: () => void; // dipanggil setelah panel selesai menutup
  onUbahStatus: (id: string, status: string) => Promise<HasilBelajar>;
  onHapus: (id: string) => Promise<HasilBelajar>;
  onEdit: (k: KelolaTujuan) => void;
}) {
  // "item" menyimpan tujuan terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<KelolaTujuan | null>(konfig);
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [bagian, setBagian] = useState<"status" | "kelola">("status");

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
    setBagian("status");
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
              <Text style={s.judul}>Hapus tujuan ini?</Text>
              <Text style={s.teksKonfirmasi}>
                Tujuan &quot;{data.judul}&quot; beserta semua topik dan sesi
                belajarnya akan dihapus permanen dan tidak bisa dikembalikan.
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
              <Text style={s.judul} numberOfLines={2}>
                {data.judul}
              </Text>
              <View style={s.tag}>
                <TagTitik
                  label={LABEL_STATUS[data.status] ?? data.status}
                  warna={WARNA_STATUS[data.status] ?? C.mist}
                />
              </View>

              <View style={s.tabWadah}>
                {(["status", "kelola"] as const).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      if (proses) return;
                      setGalat(null);
                      setBagian(k);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: bagian === k }}
                    style={[s.tab, bagian === k && s.tabAktif]}
                  >
                    <Text
                      style={[
                        s.teksTab,
                        { color: bagian === k ? C.ink : C.mist },
                      ]}
                    >
                      {k === "status" ? "Status" : "Kelola"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {galat ? <Text style={s.galat}>{galat}</Text> : null}

              <View style={s.aksi}>
                {bagian === "status" ? (
                  data.status === "active" ? (
                    <>
                      <Tombol
                        label="Tandai selesai"
                        gaya="garis"
                        memuat={proses === "completed"}
                        nonaktif={proses !== null}
                        onPress={() =>
                          jalankan("completed", () =>
                            onUbahStatus(data.id, "completed")
                          )
                        }
                      />
                      <Tombol
                        label="Arsipkan"
                        gaya="garis"
                        memuat={proses === "archived"}
                        nonaktif={proses !== null}
                        onPress={() =>
                          jalankan("archived", () =>
                            onUbahStatus(data.id, "archived")
                          )
                        }
                      />
                    </>
                  ) : (
                    <Tombol
                      label="Aktifkan kembali"
                      gaya="garis"
                      memuat={proses === "active"}
                      nonaktif={proses !== null}
                      onPress={() =>
                        jalankan("active", () => onUbahStatus(data.id, "active"))
                      }
                    />
                  )
                ) : (
                  <>
                    <Tombol
                      label="Edit tujuan"
                      gaya="garis"
                      nonaktif={proses !== null}
                      onPress={() => onEdit(data)}
                    />
                    <Tombol
                      label="Hapus tujuan"
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
  tabWadah: {
    marginTop: 16,
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  tabAktif: { backgroundColor: C.aqua },
  teksTab: { fontSize: 13, fontWeight: "600" },
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