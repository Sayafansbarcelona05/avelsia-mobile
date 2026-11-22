import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import type { RefEd, SubEd, TopikEd } from "../../lib/belajar-ai-ed";
import { C } from "../dashboard/panel-kartu";

export const kolom: TextStyle = {
  borderRadius: 12,
  borderWidth: 1,
  borderColor: C.line,
  backgroundColor: "rgba(8,11,22,0.6)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  color: C.snow,
};

export function Centang({
  nilai,
  nonaktif,
  onUbah,
  label,
}: {
  nilai: boolean;
  nonaktif?: boolean;
  onUbah: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!nonaktif) onUbah(!nilai);
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: nilai, disabled: nonaktif }}
      hitSlop={8}
      style={[s.kotak, nilai && s.kotakAktif, nonaktif && { opacity: 0.5 }]}
    >
      {nilai ? <Text style={s.centang}>✓</Text> : null}
    </Pressable>
  );
}

export function DaftarRef({
  daftar,
  aktif,
  onUbah,
}: {
  daftar: RefEd[];
  aktif: boolean;
  onUbah: (ref: RefEd[]) => void;
}) {
  if (daftar.length === 0) return null;
  const ubah = (kid: string, p: Partial<RefEd>) =>
    onUbah(daftar.map((r) => (r.kid === kid ? { ...r, ...p } : r)));
  return (
    <View style={s.ref}>
      <Text style={s.refJudul}>Referensi usulan AI</Text>
      <Text style={s.refKet}>
        Ini hanya usulan. Kamu bebas belajar dari referensi sendiri atau tautan
        lain.
      </Text>
      {daftar.map((r) => (
        <View key={r.kid} style={s.refBaris}>
          <View style={s.baris}>
            <Centang
              nilai={r.pilih}
              nonaktif={!aktif}
              onUbah={(v) => ubah(r.kid, { pilih: v })}
              label={`Simpan referensi ${r.judul}`}
            />
            <Text style={s.chip}>{r.jenis}</Text>
            <TextInput
              value={r.judul}
              maxLength={200}
              editable={aktif && r.pilih}
              onChangeText={(v) => ubah(r.kid, { judul: v })}
              accessibilityLabel="Judul referensi"
              style={[
                kolom,
                s.isi,
                { fontSize: 12 },
                !(aktif && r.pilih) && { opacity: 0.6 },
              ]}
            />
          </View>
          {r.tautan ? (
            <Text
              accessibilityRole="link"
              onPress={() => {
                Linking.openURL(r.tautan).catch(() => {});
              }}
              style={s.tautan}
            >
              {r.tautan}
            </Text>
          ) : null}
          {r.catatan ? <Text style={s.refKet}>{r.catatan}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function BarisSub({
  sub,
  aktif,
  onUbah,
}: {
  sub: SubEd;
  aktif: boolean;
  onUbah: (p: Partial<SubEd>) => void;
}) {
  const bisa = aktif && sub.pilih;
  return (
    <View style={{ gap: 6 }}>
      <View style={s.baris}>
        <Centang
          nilai={sub.pilih}
          nonaktif={!aktif}
          onUbah={(v) => onUbah({ pilih: v })}
          label={`Simpan sub topik ${sub.judul}`}
        />
        <TextInput
          value={sub.judul}
          maxLength={120}
          editable={bisa}
          onChangeText={(v) => onUbah({ judul: v })}
          accessibilityLabel="Judul sub topik"
          style={[kolom, s.isi, !bisa && { opacity: 0.6 }]}
        />
        <TextInput
          value={sub.menit}
          editable={bisa}
          keyboardType="number-pad"
          onChangeText={(v) => onUbah({ menit: v })}
          accessibilityLabel={`Estimasi menit ${sub.judul}`}
          style={[kolom, s.angka, !bisa && { opacity: 0.6 }]}
        />
        <Text style={s.satuan}>mnt</Text>
      </View>
      <DaftarRef
        daftar={sub.ref}
        aktif={bisa}
        onUbah={(ref) => onUbah({ ref })}
      />
    </View>
  );
}

export function EditorTopik({
  topik,
  onTopik,
  onSub,
}: {
  topik: TopikEd[];
  onTopik: (kid: string, p: Partial<TopikEd>) => void;
  onSub: (kid: string, ks: string, p: Partial<SubEd>) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {topik.map((t) => (
        <View key={t.kid} style={s.kartu}>
          <View style={s.baris}>
            <Centang
              nilai={t.pilih}
              onUbah={(v) => onTopik(t.kid, { pilih: v })}
              label={`Simpan topik ${t.judul}`}
            />
            <TextInput
              value={t.judul}
              maxLength={120}
              editable={t.pilih}
              onChangeText={(v) => onTopik(t.kid, { judul: v })}
              accessibilityLabel="Judul topik"
              style={[kolom, s.isi, { fontWeight: "500" }, !t.pilih && { opacity: 0.6 }]}
            />
            {t.sub.length === 0 ? (
              <>
                <TextInput
                  value={t.menit}
                  editable={t.pilih}
                  keyboardType="number-pad"
                  onChangeText={(v) => onTopik(t.kid, { menit: v })}
                  accessibilityLabel={`Estimasi menit ${t.judul}`}
                  style={[kolom, s.angka, !t.pilih && { opacity: 0.6 }]}
                />
                <Text style={s.satuan}>mnt</Text>
              </>
            ) : null}
          </View>

          {t.sub.length === 0 ? (
            <DaftarRef
              daftar={t.ref}
              aktif={t.pilih}
              onUbah={(ref) => onTopik(t.kid, { ref })}
            />
          ) : (
            <View style={s.daftarSub}>
              {t.sub.map((x) => (
                <BarisSub
                  key={x.kid}
                  sub={x}
                  aktif={t.pilih}
                  onUbah={(p) => onSub(t.kid, x.kid, p)}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  kotak: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  kotakAktif: { backgroundColor: C.aqua, borderColor: C.aqua },
  centang: { fontSize: 14, fontWeight: "700", color: C.ink },

  kartu: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.4)",
  },
  baris: { flexDirection: "row", alignItems: "center", gap: 8 },
  isi: { flex: 1, minWidth: 0 },
  angka: { width: 64, textAlign: "center" },
  satuan: { fontSize: 12, color: C.mist },
  daftarSub: {
    gap: 12,
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
  },

  ref: { gap: 6, marginTop: 4 },
  refJudul: { fontSize: 12, fontWeight: "500", color: C.mist },
  refKet: { fontSize: 12, lineHeight: 17, color: C.mist },
  refBaris: { gap: 4 },
  chip: {
    fontSize: 12,
    color: C.mist,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  tautan: {
    paddingLeft: 30,
    fontSize: 12,
    lineHeight: 17,
    color: C.aqua,
    textDecorationLine: "underline",
  },
});