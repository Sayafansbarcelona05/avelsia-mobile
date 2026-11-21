import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { mulaiTes } from "../../lib/tes";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "../tugas/lembar-bawah";

export type TargetTes = {
  topicId: string;
  goalId: string;
  judul: string;
  kata: string; // "topik" | "sub topik"
};

export default function DialogTes({
  target,
  onTutup,
  onSiap,
  onSelesaiTutup,
}: {
  target: TargetTes | null;
  onTutup: () => void;
  onSiap: (t: TargetTes) => void; // soal sudah siap, lanjut ke ruang tes
  onSelesaiTutup?: () => void; // dipanggil setelah panel selesai menutup
}) {
  // "item" menyimpan target terakhir supaya isi panel tetap ada saat animasi tutup
  const [item, setItem] = useState<TargetTes | null>(target);
  const [setuju, setSetuju] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (target) setItem(target);
  }, [target]);

  const data = target ?? item;

  function tutup() {
    if (proses) return;
    onTutup();
  }

  function reset() {
    setItem(null);
    setSetuju(false);
    setGalat(null);
    setProses(false);
    onSelesaiTutup?.();
  }

  async function mulai() {
    if (!data || !setuju || proses) return;
    setProses(true);
    setGalat(null);
    try {
      const hasil = await mulaiTes(data.topicId, data.goalId, true);
      if (hasil.ok) onSiap(data);
      else setGalat(hasil.pesan);
    } catch {
      setGalat("Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(false);
    }
  }

  return (
    <LembarBawah terbuka={target !== null} onTutup={tutup} onSelesaiTutup={reset}>
      {data ? (
        <View style={s.isi}>
          <Text style={s.judul}>Sebelum mulai tes</Text>
          <Text style={s.sub} numberOfLines={2}>
            {data.judul}
          </Text>

          <View style={s.daftar}>
            <Text style={s.butir}>
              • Seperti ujian sungguhan: 10 soal pilihan ganda tingkat menengah
              ke atas, lulus jika benar minimal 80%.
            </Text>
            <Text style={s.butir}>
              • <Text style={s.tebal}>Jangan memakai AI, mesin pencari, catatan,
              atau alat bantu apa pun.</Text> Tes ini hanya berguna kalau
              mengukur kemampuanmu sendiri.
            </Text>
            <Text style={s.butir}>• Tidak ada batas waktu.</Text>
            <Text style={s.butir}>
              • Keluar dari app atau pindah ke app lain dihitung sebagai
              pelanggaran. Setelah 3 kali, tes dianggap gagal.
            </Text>
            <Text style={s.butir}>
              • Selama belum lulus, status tetap &quot;Sedang dipelajari&quot;.
            </Text>
          </View>

          <Pressable
            onPress={() => !proses && setSetuju((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: setuju, disabled: proses }}
            style={s.baris}
          >
            <View style={[s.kotak, setuju && s.kotakAktif]}>
              {setuju ? <Text style={s.centang}>✓</Text> : null}
            </View>
            <Text style={s.teksSetuju}>
              Saya mengerjakan tes ini sendiri, tanpa AI dan tanpa alat bantu.
            </Text>
          </Pressable>

          {proses ? (
            <Text style={s.info}>
              Soal sedang dibuat. Ini bisa memakan waktu sampai satu menit,
              jangan tutup layar ini.
            </Text>
          ) : null}
          {galat ? <Text style={s.galat}>{galat}</Text> : null}

          <View style={s.aksi}>
            <Pressable
              onPress={mulai}
              disabled={!setuju || proses}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.tombol,
                s.tombolUtama,
                (!setuju || proses) && !proses && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {proses ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <Text style={[s.teksTombol, { color: C.ink }]}>Mulai tes</Text>
              )}
            </Pressable>
            <Pressable
              onPress={tutup}
              disabled={proses}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.tombol,
                s.tombolGaris,
                proses && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[s.teksTombol, { color: C.snow }]}>Batal</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </LembarBawah>
  );
}

const s = StyleSheet.create({
  isi: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  judul: { fontSize: 18, fontWeight: "600", lineHeight: 24, color: C.snow },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.mist },
  daftar: { marginTop: 14, gap: 8 },
  butir: { fontSize: 13, lineHeight: 19, color: C.mist },
  tebal: { fontWeight: "600", color: C.snow },
  baris: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kotak: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  kotakAktif: { backgroundColor: C.aqua, borderColor: C.aqua },
  centang: { fontSize: 14, fontWeight: "700", color: C.ink },
  teksSetuju: { flex: 1, fontSize: 14, lineHeight: 20, color: C.snow },
  info: { marginTop: 14, fontSize: 13, lineHeight: 18, color: C.mist },
  galat: {
    marginTop: 14,
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