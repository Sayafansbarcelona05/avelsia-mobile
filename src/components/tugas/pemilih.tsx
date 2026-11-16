import { useRef, useState, type ComponentRef } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { C } from "../dashboard/panel-kartu";
import { LembarBawah } from "./lembar-bawah";

/* ====== Bantuan tanggal & waktu ====== */
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

const pad = (n: number) => String(n).padStart(2, "0");
const kunci = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

function urai(s: string) {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return r ? { y: +r[1], m: +r[2] - 1, d: +r[3] } : null;
}

function tambahBulan(k: string, n: number) {
  const p = urai(k)!;
  const t = new Date(Date.UTC(p.y, p.m + n, 1));
  const maks = new Date(
    Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return kunci(t.getUTCFullYear(), t.getUTCMonth(), Math.min(p.d, maks));
}

function formatPendek(k: string) {
  const p = urai(k);
  return p ? `${p.d} ${BULAN[p.m].slice(0, 3)} ${p.y}` : "";
}

function hariIniLokal() {
  const d = new Date();
  return kunci(d.getFullYear(), d.getMonth(), d.getDate());
}

function pecah(s: string) {
  const r = /^(\d{2}):(\d{2})/.exec(s);
  return r ? { j: +r[1], m: +r[2] } : { j: null, m: null };
}

/* ====== Ikon ====== */
function IkonKalender() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.mist}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </Svg>
  );
}

function IkonJam() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.mist}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

function IkonPanah({ arah }: { arah: "kiri" | "kanan" }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.mist}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={arah === "kiri" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </Svg>
  );
}

/* ====== Pemilih tanggal ====== */
export function PilihTanggal({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // YYYY-MM-DD, kosong = belum dipilih
  onChange: (v: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  const [tampil, setTampil] = useState(hariIniLokal());

  function bukaPopup() {
    setTampil(urai(value) ? value : hariIniLokal());
    setBuka(true);
  }

  function pilih(k: string) {
    onChange(k);
    setBuka(false);
  }

  const b = urai(tampil)!;
  const hariIni = hariIniLokal();
  const awal = (new Date(Date.UTC(b.y, b.m, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const jml = new Date(Date.UTC(b.y, b.m + 1, 0)).getUTCDate();
  const sel: (string | null)[] = [];
  for (let i = 0; i < awal; i++) sel.push(null);
  for (let d = 1; d <= jml; d++) sel.push(kunci(b.y, b.m, d));

  return (
    <View style={s.kolom}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        onPress={bukaPopup}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatPendek(value) : "belum dipilih"}`}
        style={s.field}
      >
        <Text
          style={[s.nilai, !value && { color: C.mist }]}
          numberOfLines={1}
        >
          {value ? formatPendek(value) : "Pilih tanggal"}
        </Text>
        <IkonKalender />
      </Pressable>

      <LembarBawah terbuka={buka} onTutup={() => setBuka(false)}>
        <View style={s.isiPicker}>
          <View style={s.barisBulan}>
            <Pressable
              onPress={() => setTampil(tambahBulan(tampil, -1))}
              accessibilityLabel="Bulan sebelumnya"
              style={s.tombolBulat}
            >
              <IkonPanah arah="kiri" />
            </Pressable>
            <Text style={s.judulBulan}>
              {BULAN[b.m]} {b.y}
            </Text>
            <Pressable
              onPress={() => setTampil(tambahBulan(tampil, 1))}
              accessibilityLabel="Bulan berikutnya"
              style={s.tombolBulat}
            >
              <IkonPanah arah="kanan" />
            </Pressable>
          </View>

          <View style={s.barisHari}>
            {HARI.map((h) => (
              <Text key={h} style={s.namaHari}>
                {h}
              </Text>
            ))}
          </View>

          <View style={s.gridHari}>
            {sel.map((k, i) => {
              if (!k) return <View key={`kosong-${i}`} style={s.sel} />;
              const t = urai(k)!;
              const terpilih = k === value;
              const ini = k === hariIni;
              return (
                <Pressable
                  key={k}
                  onPress={() => pilih(k)}
                  accessibilityLabel={`${t.d} ${BULAN[t.m]} ${t.y}`}
                  accessibilityState={{ selected: terpilih }}
                  style={s.sel}
                >
                  <View
                    style={[
                      s.hari,
                      terpilih && s.hariTerpilih,
                      !terpilih && ini && s.hariIni,
                    ]}
                  >
                    <Text style={[s.teksHari, terpilih && s.teksHariTerpilih]}>
                      {t.d}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={s.kakiPicker}>
            <Pressable onPress={() => pilih(hariIni)} style={s.tombolTeks}>
              <Text style={s.teksAqua}>Hari ini</Text>
            </Pressable>
            <Pressable onPress={() => setBuka(false)} style={s.tombolTeks}>
              <Text style={s.teksMist}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </LembarBawah>
    </View>
  );
}

/* ====== Pemilih jam ====== */
const TINGGI_ITEM = 32;
const DAFTAR_JAM = Array.from({ length: 24 }, (_, i) => i);
const DAFTAR_MENIT = Array.from({ length: 60 }, (_, i) => i);

function KolomAngka({
  judul,
  daftar,
  terpilih,
  onPilih,
}: {
  judul: string;
  daftar: number[];
  terpilih: number | null;
  onPilih: (n: number) => void;
}) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.judulKolom}>{judul}</Text>
      <ScrollView
        ref={ref}
        style={s.gulirKolom}
        contentContainerStyle={{ padding: 4 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onLayout={() => {
          const idx = terpilih ?? 0;
          ref.current?.scrollTo({
            y: Math.max(idx * TINGGI_ITEM + 4 - 72, 0),
            animated: false,
          });
        }}
      >
        {daftar.map((n) => (
          <Pressable
            key={n}
            onPress={() => onPilih(n)}
            accessibilityState={{ selected: terpilih === n }}
            style={[s.itemAngka, terpilih === n && s.itemAngkaOn]}
          >
            <Text style={[s.teksAngka, terpilih === n && s.teksAngkaOn]}>
              {pad(n)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function PilihJam({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // HH:MM, kosong = belum dipilih
  onChange: (v: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  const { j, m } = pecah(value);

  function setBagian(bagian: "j" | "m", v: number) {
    const jam = bagian === "j" ? v : (j ?? 0);
    const menit = bagian === "m" ? v : (m ?? 0);
    onChange(`${pad(jam)}:${pad(menit)}`);
  }

  return (
    <View style={s.kolom}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        onPress={() => setBuka(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || "belum dipilih"}`}
        style={s.field}
      >
        <Text style={[s.nilai, !value && { color: C.mist }]}>
          {value || "Pilih jam"}
        </Text>
        <IkonJam />
      </Pressable>

      <LembarBawah terbuka={buka} onTutup={() => setBuka(false)}>
        <View style={s.isiPicker}>
          <View style={s.duaKolom}>
            <KolomAngka
              judul="Jam"
              daftar={DAFTAR_JAM}
              terpilih={j}
              onPilih={(n) => setBagian("j", n)}
            />
            <KolomAngka
              judul="Menit"
              daftar={DAFTAR_MENIT}
              terpilih={m}
              onPilih={(n) => setBagian("m", n)}
            />
          </View>
          <View style={s.kakiPicker}>
            <Pressable
              onPress={() => {
                const d = new Date();
                onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
              }}
              style={s.tombolTeks}
            >
              <Text style={s.teksAqua}>Sekarang</Text>
            </Pressable>
            <Pressable onPress={() => setBuka(false)} style={s.tombolSelesai}>
              <Text style={s.teksSelesai}>Selesai</Text>
            </Pressable>
          </View>
        </View>
      </LembarBawah>
    </View>
  );
}

/* ====== Pemilih prioritas ====== */
const OPSI_PRIORITAS = [
  { nilai: "low", label: "Rendah", warna: C.lilac },
  { nilai: "medium", label: "Sedang", warna: C.aqua },
  { nilai: "high", label: "Tinggi", warna: C.brand },
];

export function PilihPrioritas({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={s.label}>Prioritas</Text>
      <View style={s.barisPrioritas}>
        {OPSI_PRIORITAS.map((o) => {
          const on = o.nilai === value;
          return (
            <Pressable
              key={o.nilai}
              onPress={() => onChange(o.nilai)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[s.chip, on && s.chipOn]}
            >
              <View style={[s.titik, { backgroundColor: o.warna }]} />
              <Text style={[s.teksChip, on && { color: C.snow }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  /* lembar */
  wadah: { flex: 1, justifyContent: "flex-end" },
  latar: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,11,22,0.7)" },
  panel: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.line,
    maxHeight: "92%",
    paddingTop: 12,
  },
  pegangan: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    marginBottom: 8,
  },

  /* kolom isian */
  kolom: { flex: 1 },
  label: { fontSize: 13, color: C.mist },
  field: {
    marginTop: 6,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nilai: { flexShrink: 1, fontSize: 14, color: C.snow },

  /* isi pemilih */
  isiPicker: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  kakiPicker: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tombolTeks: { paddingHorizontal: 12, paddingVertical: 8 },
  teksAqua: { fontSize: 13, fontWeight: "600", color: C.aqua },
  teksMist: { fontSize: 13, fontWeight: "500", color: C.mist },
  tombolSelesai: {
    borderRadius: 999,
    backgroundColor: C.aqua,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  teksSelesai: { fontSize: 13, fontWeight: "600", color: C.ink },

  /* kalender */
  barisBulan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tombolBulat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  judulBulan: { fontSize: 15, fontWeight: "600", color: C.snow },
  barisHari: { flexDirection: "row" },
  namaHari: {
    width: "14.2857%",
    textAlign: "center",
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "500",
    color: C.mist,
  },
  gridHari: { flexDirection: "row", flexWrap: "wrap" },
  sel: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  hari: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hariTerpilih: { backgroundColor: C.aqua },
  hariIni: { borderWidth: 1, borderColor: C.mist },
  teksHari: { fontSize: 14, color: C.snow },
  teksHariTerpilih: { fontWeight: "600", color: C.ink },

  /* jam */
  duaKolom: { flexDirection: "row", gap: 8 },
  judulKolom: { paddingBottom: 6, paddingLeft: 4, fontSize: 11, fontWeight: "500", color: C.mist },
  gulirKolom: {
    height: 176,
    borderRadius: 12,
    backgroundColor: "rgba(8,11,22,0.5)",
  },
  itemAngka: {
    height: TINGGI_ITEM,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  itemAngkaOn: { backgroundColor: C.aqua },
  teksAngka: { fontSize: 14, color: C.snow },
  teksAngkaOn: { fontWeight: "600", color: C.ink },

  /* prioritas */
  barisPrioritas: { marginTop: 6, flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  chipOn: { borderColor: C.aqua },
  titik: { width: 8, height: 8, borderRadius: 4 },
  teksChip: { fontSize: 13, fontWeight: "500", color: C.mist },
});