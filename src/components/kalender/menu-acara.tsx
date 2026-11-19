import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { Acara, HasilAcara } from "../../lib/kalender";
import { C, TagTitik } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";

type Gaya = "utama" | "garis" | "teks";
type StatusAcara = "active" | "completed";

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

export default function MenuAcara({
  acara,
  waktu,
  onTutup,
  onUbahStatus,
  onHapus,
  onEdit,
}: {
  acara: Acara | null;
  waktu: string;
  onTutup: () => void;
  onUbahStatus: (id: string, status: StatusAcara) => Promise<HasilAcara>;
  onHapus: (id: string) => Promise<HasilAcara>;
  onEdit: (a: Acara) => void;
}) {
  // "item" menyimpan acara terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<Acara | null>(acara);
  const [proses, setProses] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [bagian, setBagian] = useState<"status" | "kelola">("status");
  const [waktuTersimpan, setWaktuTersimpan] = useState(waktu);

  useEffect(() => {
    if (acara) {
      setItem(acara);
      setWaktuTersimpan(waktu);
    }
  }, [acara, waktu]);

  const data = acara ?? item;
  const selesai = data?.status === "completed";

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
  }

  async function ubahStatus() {
    if (!data || proses) return;
    const baru: StatusAcara = selesai ? "active" : "completed";
    setProses("status");
    setGalat(null);
    const hasil = await onUbahStatus(data.id, baru);
    setProses(null);
    if (hasil.ok) {
      onTutup();
    } else {
      setGalat(hasil.bentrok ? `Jadwal bentrok. ${hasil.pesan}` : hasil.pesan);
    }
  }

  async function hapus() {
    if (!data || proses) return;
    setProses("hapus");
    setGalat(null);
    const hasil = await onHapus(data.id);
    setProses(null);
    if (hasil.ok) {
      onTutup();
    } else {
      setGalat(hasil.pesan);
    }
  }

  return (
    <LembarBawah
      terbuka={acara !== null}
      onTutup={tutup}
      onSelesaiTutup={reset}
    >
      {data ? (
        <View style={s.isi}>
          {konfirmasiHapus ? (
            <>
              <Text style={s.judul}>Yakin ingin menghapus acara?</Text>
              <Text style={s.teksKonfirmasi}>
                Acara &quot;{data.title}&quot; akan dihapus dan tidak bisa
                dikembalikan.
              </Text>

              {galat ? <Text style={s.galat}>{galat}</Text> : null}

              <View style={s.aksi}>
                <Tombol
                  label="Ya, hapus"
                  gaya="utama"
                  memuat={proses === "hapus"}
                  nonaktif={proses !== null}
                  onPress={hapus}
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
                {data.title}
              </Text>
              <Text style={s.info}>{waktuTersimpan}</Text>
              {data.location ? (
                <Text style={s.info}>{data.location}</Text>
              ) : null}
              <View style={s.tag}>
                <TagTitik
                  label={selesai ? "Selesai" : "Aktif"}
                  warna={selesai ? C.aqua : C.brand}
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
                  <Tombol
                    label={selesai ? "Buka kembali" : "Tandai selesai"}
                    gaya="utama"
                    memuat={proses === "status"}
                    nonaktif={proses !== null}
                    onPress={ubahStatus}
                  />
                ) : (
                  <>
                    <Tombol
                      label="Edit acara"
                      gaya="garis"
                      nonaktif={proses !== null}
                      onPress={() => onEdit(data)}
                    />
                    <Tombol
                      label="Hapus acara"
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
  info: { marginTop: 4, fontSize: 13, color: C.mist },
  teksKonfirmasi: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: C.mist,
  },
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