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

export type KelolaTopik = {
  id: string;
  judul: string;
  status: string; // not_started | in_progress | done
  punyaAnak: boolean;
  subtopik: boolean;
  pertama: boolean; // paling atas di antara saudaranya
  terakhir: boolean; // paling bawah di antara saudaranya
  estimasiSendiri: number | null;
  bisaTes?: boolean; // tanpa sub topik dan sudah punya sesi selesai
  sudahLulus?: boolean;
};

type Gaya = "utama" | "garis" | "teks";

const LABEL_STATUS: Record<string, string> = {
  not_started: "Belum mulai",
  in_progress: "Sedang dipelajari",
  done: "Selesai",
};
const WARNA_STATUS: Record<string, string> = {
  not_started: C.mist,
  in_progress: C.lilac,
  done: C.aqua,
};
// "Selesai" hanya bisa lewat latihan (dijaga database), jadi tidak ditawarkan di sini
const PILIHAN_STATUS = ["not_started", "in_progress"] as const;

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

export default function MenuTopik({
  konfig,
  onTutup,
  onSelesaiTutup,
  onUbahStatus,
  onGeser,
  onHapus,
  onEdit,
  onTambahSub,
  onMulaiTes,
}: {
  konfig: KelolaTopik | null;
  onTutup: () => void;
  onSelesaiTutup?: () => void; // dipanggil setelah panel selesai menutup
  onUbahStatus: (id: string, status: string) => Promise<HasilBelajar>;
  onGeser: (id: string, arah: "naik" | "turun") => Promise<HasilBelajar>;
  onHapus: (id: string) => Promise<HasilBelajar>;
  onEdit: (k: KelolaTopik) => void;
  onTambahSub: (k: KelolaTopik) => void;
  onMulaiTes?: (k: KelolaTopik) => void;
}) {
  // "item" menyimpan topik terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<KelolaTopik | null>(konfig);
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
              <Text style={s.judul}>
                Yakin ingin menghapus {data.subtopik ? "sub topik" : "topik"}?
              </Text>
              <Text style={s.teksKonfirmasi}>
                &quot;{data.judul}&quot; akan dihapus dan tidak bisa
                dikembalikan.
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
                  data.punyaAnak ? (
                    <Text style={s.teksKonfirmasi}>
                      Status topik ini mengikuti sub topiknya. Ubah status
                      sub topiknya.
                    </Text>
                  ) : (
                    <>
                      {(data.sudahLulus
                        ? [...PILIHAN_STATUS, "done"]
                        : [...PILIHAN_STATUS]
                      ).map((st) => (
                        <Tombol
                          key={st}
                          label={LABEL_STATUS[st]}
                          gaya={data.status === st ? "utama" : "garis"}
                          memuat={proses === st}
                          nonaktif={proses !== null || data.status === st}
                          onPress={() =>
                            jalankan(st, () => onUbahStatus(data.id, st))
                          }
                        />
                      ))}
                      {data.bisaTes && !data.sudahLulus && onMulaiTes ? (
                        <Tombol
                          label={data.subtopik ? "Tes sub topik" : "Tes topik"}
                          gaya="utama"
                          nonaktif={proses !== null}
                          onPress={() => onMulaiTes(data)}
                        />
                      ) : null}
                      <Text style={s.petunjuk}>
                        {data.status === "done"
                          ? `${data.subtopik ? "Sub topik" : "Topik"} ini sudah selesai.`
                          : data.sudahLulus
                            ? "Kamu sudah lulus tes ini."
                            : data.bisaTes
                              ? "Status Selesai diraih dengan lulus tes (minimal 80%)."
                              : "Selesaikan minimal satu sesi belajar dulu untuk membuka tes."}
                      </Text>
                    </>
                  )
                ) : (
                  <>
                    <Tombol
                      label={data.subtopik ? "Edit sub topik" : "Edit topik"}
                      gaya="garis"
                      nonaktif={proses !== null}
                      onPress={() => onEdit(data)}
                    />
                    {!data.subtopik ? (
                      <Tombol
                        label="Tambah sub topik"
                        gaya="garis"
                        nonaktif={proses !== null}
                        onPress={() => onTambahSub(data)}
                      />
                    ) : null}
                    <Tombol
                      label="Geser ke atas"
                      gaya="garis"
                      memuat={proses === "naik"}
                      nonaktif={proses !== null || data.pertama}
                      onPress={() =>
                        jalankan("naik", () => onGeser(data.id, "naik"))
                      }
                    />
                    <Tombol
                      label="Geser ke bawah"
                      gaya="garis"
                      memuat={proses === "turun"}
                      nonaktif={proses !== null || data.terakhir}
                      onPress={() =>
                        jalankan("turun", () => onGeser(data.id, "turun"))
                      }
                    />
                    <Tombol
                      label={data.subtopik ? "Hapus sub topik" : "Hapus topik"}
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
  petunjuk: { fontSize: 12, lineHeight: 17, color: C.mist },
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