import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import type { HasilBelajar } from "../../lib/belajar-aksi";
import type { RefTopik } from "../../lib/belajar-detail";
import { C } from "../dashboard/panel-kartu";

const LABEL_JENIS: Record<string, string> = {
  artikel: "Artikel",
  video: "Video",
  buku: "Buku",
  dokumentasi: "Dokumentasi",
  lainnya: "Lainnya",
};

export type ReferensiSub = { sumber: string; items: RefTopik[] };

// Aksi yang disiapkan layar tujuan, dipakai kartu topik dan sub topik
export type AksiRef = {
  tambah: (topicId: string, judul: string) => void;
  ubah: (judul: string, r: RefTopik) => void;
  hapus: (id: string) => Promise<HasilBelajar>;
};

function bisaDibuka(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

function BarisRef({
  r,
  onEdit,
  onHapus,
}: {
  r: RefTopik;
  onEdit?: () => void;
  onHapus?: () => void;
}) {
  const adaTautan = bisaDibuka(r.url);
  return (
    <View style={{ gap: 6 }}>
      <View style={s.barisJudul}>
        <Text style={s.chip}>{LABEL_JENIS[r.kind] ?? r.kind}</Text>
        {adaTautan ? (
          <Text
            accessibilityRole="link"
            accessibilityHint="Membuka di browser"
            onPress={() => {
              Linking.openURL(r.url as string).catch(() => {});
            }}
            style={s.tautan}
          >
            {r.title}
          </Text>
        ) : (
          <Text style={s.judulBiasa}>{r.title}</Text>
        )}
      </View>
      {!adaTautan ? (
        <Text style={s.kecil}>belum ada tautan (bisa ditambah lewat Edit)</Text>
      ) : null}
      {r.notes ? <Text style={s.catatan}>{r.notes}</Text> : null}
      {onEdit || onHapus ? (
        <View style={s.aksi}>
          {onEdit ? (
            <Pressable
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel={`Edit referensi ${r.title}`}
              style={s.tombolKecil}
            >
              <Text style={s.teksTombolKecil}>Edit</Text>
            </Pressable>
          ) : null}
          {onHapus ? (
            <Pressable
              onPress={onHapus}
              accessibilityRole="button"
              accessibilityLabel={`Hapus referensi ${r.title}`}
              style={s.tombolKecil}
            >
              <Text style={s.teksTombolKecil}>Hapus</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function DaftarReferensi({
  items,
  dariSub = [],
  onTambah,
  onEdit,
  onHapus,
}: {
  items: RefTopik[];
  dariSub?: ReferensiSub[];
  onTambah?: () => void;
  onEdit?: (r: RefTopik) => void;
  onHapus?: (id: string) => Promise<HasilBelajar>;
}) {
  const [buka, setBuka] = useState(false);
  const jumlahSub = dariSub.reduce((a, g) => a + g.items.length, 0);
  const total = items.length + jumlahSub;

  function konfirmasiHapus(r: RefTopik) {
    if (!onHapus) return;
    Alert.alert("Hapus referensi ini?", `Referensi "${r.title}" akan dihapus.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, hapus",
        style: "destructive",
        onPress: async () => {
          try {
            const h = await onHapus(r.id);
            if (!h.ok) Alert.alert("Gagal menghapus", h.pesan);
          } catch {
            Alert.alert("Gagal menghapus", "Terjadi gangguan jaringan.");
          }
        },
      },
    ]);
  }

  return (
    <View style={s.kotak}>
      <Pressable
        onPress={() => setBuka(!buka)}
        accessibilityRole="button"
        accessibilityState={{ expanded: buka }}
        style={s.kepala}
      >
        <Text style={s.judul}>Referensi ({total})</Text>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.mist}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: [{ rotate: buka ? "180deg" : "0deg" }] }}
        >
          <Path d="M6 10l6 6 6-6" />
        </Svg>
      </Pressable>

      {buka ? (
        <View style={s.isi}>
          {total === 0 ? (
            <Text style={s.catatan}>
              Belum ada referensi. Tambahkan artikel, video, buku, atau
              dokumentasi yang kamu pakai untuk mempelajari ini.
            </Text>
          ) : null}

          {items.map((r) => (
            <BarisRef
              key={r.id}
              r={r}
              onEdit={onEdit ? () => onEdit(r) : undefined}
              onHapus={onHapus ? () => konfirmasiHapus(r) : undefined}
            />
          ))}

          {dariSub
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <View key={g.sumber} style={s.grupSub}>
                <Text style={s.labelSub} numberOfLines={2}>
                  DARI SUB TOPIK: {g.sumber.toUpperCase()}
                </Text>
                {g.items.map((r) => (
                  <BarisRef key={r.id} r={r} />
                ))}
              </View>
            ))}

          {jumlahSub > 0 ? (
            <Text style={s.kecil}>
              Referensi sub topik diubah atau dihapus langsung di sub topiknya.
            </Text>
          ) : null}

          <Text style={s.petunjuk}>
            Referensi di sini bukan satu-satunya. Kamu bebas belajar dari
            referensi sendiri atau tautan lain, lalu tambahkan di sini supaya
            tersimpan bersama topik ini.
          </Text>

          {onTambah ? (
            <Pressable
              onPress={onTambah}
              accessibilityRole="button"
              style={({ pressed }) => [s.tombolTambah, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.teksTambah}>Tambah referensi</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  kotak: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.4)",
  },
  kepala: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
  },
  judul: { fontSize: 13, fontWeight: "500", color: C.snow },
  isi: {
    gap: 14,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  barisJudul: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    fontSize: 11,
    color: C.mist,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  tautan: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.aqua,
    textDecorationLine: "underline",
  },
  judulBiasa: { flexShrink: 1, fontSize: 14, fontWeight: "500", color: C.snow },
  catatan: { fontSize: 12, lineHeight: 17, color: C.mist },
  kecil: { fontSize: 11, lineHeight: 16, color: C.mist },
  aksi: { flexDirection: "row", gap: 8, marginTop: 2 },
  tombolKecil: {
    minHeight: 34,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
  },
  teksTombolKecil: { fontSize: 12, fontWeight: "500", color: C.snow },
  grupSub: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  labelSub: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: C.mist,
  },
  petunjuk: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    fontSize: 12,
    lineHeight: 17,
    color: C.mist,
  },
  tombolTambah: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
  },
  teksTambah: { fontSize: 13, fontWeight: "600", color: C.snow },
});