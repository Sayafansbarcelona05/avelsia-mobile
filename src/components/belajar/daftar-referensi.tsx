import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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

function bisaDibuka(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

function BarisRef({ r }: { r: RefTopik }) {
  const adaTautan = bisaDibuka(r.url);
  return (
    <View style={{ gap: 4 }}>
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
      {!adaTautan ? <Text style={s.kecil}>belum ada tautan</Text> : null}
      {r.notes ? <Text style={s.catatan}>{r.notes}</Text> : null}
    </View>
  );
}

export default function DaftarReferensi({
  items,
  dariSub = [],
}: {
  items: RefTopik[];
  dariSub?: ReferensiSub[];
}) {
  const [buka, setBuka] = useState(false);
  const jumlahSub = dariSub.reduce((a, g) => a + g.items.length, 0);
  const total = items.length + jumlahSub;

  // Belum ada cara menambah referensi di app, jadi daftar kosong disembunyikan
  if (total === 0) return null;

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
          {items.map((r) => (
            <BarisRef key={r.id} r={r} />
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
              Referensi sub topik dilihat langsung di sub topiknya.
            </Text>
          ) : null}

          <Text style={s.petunjuk}>
            Referensi di sini bukan satu-satunya. Kamu bebas belajar dari
            referensi sendiri atau tautan lain.
          </Text>
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
  barisJudul: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
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
});