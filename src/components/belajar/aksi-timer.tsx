import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HasilBelajar } from "../../lib/belajar-aksi";
import type { SesiDetail } from "../../lib/belajar-detail";
import { C } from "../dashboard/panel-kartu";
import { toast } from "../toast";
import type { InfoAlarm } from "./alarm-sesi";

export type PenangananTimer = {
  alarm: (info: InfoAlarm) => void;
  mulai: (id: string) => Promise<HasilBelajar>;
  hentikan: (id: string, selesai: boolean) => Promise<HasilBelajar>;
};

function formatJam(totalDetik: number) {
  const total = Math.max(0, Math.floor(totalDetik));
  const j = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const d = total % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return j > 0 ? `${j}:${dua(m)}:${dua(d)}` : `${dua(m)}:${dua(d)}`;
}

function Tombol({
  label,
  utama,
  nonaktif,
  onPress,
}: {
  label: string;
  utama?: boolean;
  nonaktif?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={nonaktif}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.tombol,
        utama ? s.tombolUtama : s.tombolGaris,
        nonaktif && { opacity: 0.6 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.teksTombol, { color: utama ? C.ink : C.snow }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AksiTimer({
  x,
  timer,
  ringkas,
}: {
  x: SesiDetail;
  timer: PenangananTimer;
  ringkas: string;
}) {
  const [proses, setProses] = useState(false);
  const [kini, setKini] = useState(() => Date.now());
  const otomatis = useRef(false);

  const berjalan = x.status === "running" && !!x.timer_started_at;
  const target = x.planned_minutes ? x.planned_minutes * 60 : null;
  const mulaiMs = x.timer_started_at ? new Date(x.timer_started_at).getTime() : 0;

  // Waktu terkumpul + waktu sejak dilanjutkan = waktu total yang nyambung
  const detikJalan = berjalan
    ? Math.max(0, Math.floor((kini - mulaiMs) / 1000))
    : 0;
  const total = x.elapsed_seconds + detikJalan;
  const lewat = target !== null && total >= target;

  // Jam berdetak tiap detik selama timer berjalan
  useEffect(() => {
    if (!berjalan) return;
    otomatis.current = false;
    setKini(Date.now());
    const t = setInterval(() => setKini(Date.now()), 1000);
    return () => clearInterval(t);
  }, [berjalan, x.timer_started_at]);

  // Begitu rencana habis, timer dihentikan otomatis (sesi selesai), lalu getar dan toast
  useEffect(() => {
    if (!berjalan || !lewat || otomatis.current) return;
    otomatis.current = true;
    (async () => {
      try {
        const hasil = await timer.hentikan(x.id, true);
        if (hasil.ok) {
          timer.alarm({ ringkas, menit: x.planned_minutes });
        } else {
          toast.peringatan("Gagal menghentikan timer otomatis", hasil.pesan);
        }
      } catch {
        toast.peringatan(
          "Gagal menghentikan timer otomatis",
          "Terjadi gangguan jaringan. Coba lagi."
        );
      }
    })();
  }, [berjalan, lewat, x.id, x.planned_minutes, ringkas, timer]);

  async function jalankan(
    kerja: () => Promise<HasilBelajar>,
    judulGagal: string
  ) {
    if (proses) return;
    setProses(true);
    try {
      const hasil = await kerja();
      if (!hasil.ok) toast.peringatan(judulGagal, hasil.pesan);
    } catch {
      toast.peringatan(judulGagal, "Terjadi gangguan jaringan. Coba lagi.");
    } finally {
      setProses(false);
    }
  }

  if (x.status !== "running" && x.status !== "planned") return null;

  const teksTarget = target ? ` / ${formatJam(target)}` : "";

  if (x.status === "running") {
    return (
      <View style={s.wadah}>
        <View style={s.barisChip}>
          <View
            accessibilityRole="timer"
            accessibilityLabel="Waktu belajar berjalan"
            style={s.chip}
          >
            <Text style={[s.teksChip, { color: lewat ? C.lilac : C.aqua }]}>
              {formatJam(total)}
              {teksTarget}
            </Text>
          </View>
          {lewat ? (
            <Text style={[s.kecil, { color: C.lilac }]}>Waktu rencana habis</Text>
          ) : null}
        </View>
        <View style={s.barisTombol}>
          <Tombol
            label="Jeda"
            nonaktif={proses}
            onPress={() =>
              jalankan(() => timer.hentikan(x.id, false), "Gagal menjeda")
            }
          />
          <Tombol
            label="Selesai"
            utama
            nonaktif={proses}
            onPress={() =>
              jalankan(
                () => timer.hentikan(x.id, true),
                "Gagal menyelesaikan"
              )
            }
          />
        </View>
      </View>
    );
  }

  // planned: belum pernah jalan, atau sedang dijeda
  return (
    <View style={s.wadah}>
      {x.elapsed_seconds > 0 ? (
        <View style={s.barisChip}>
          <View style={s.chip}>
            <Text style={[s.teksChip, { color: C.mist }]}>
              Dijeda {formatJam(x.elapsed_seconds)}
              {teksTarget}
            </Text>
          </View>
        </View>
      ) : null}
      <Tombol
        label={x.elapsed_seconds > 0 ? "Lanjutkan" : "Mulai timer"}
        utama
        nonaktif={proses}
        onPress={() =>
          jalankan(() => timer.mulai(x.id), "Gagal memulai timer")
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: 10 },
  barisChip: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(8,11,22,0.6)",
  },
  teksChip: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  kecil: { fontSize: 12, color: C.mist },
  barisTombol: { flexDirection: "row", gap: 10 },
  tombol: {
    flex: 1,
    minHeight: 44,
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