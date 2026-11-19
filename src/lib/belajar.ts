import { useCallback, useRef, useState } from "react";
import { useAuth } from "./auth";
import { tambahHari, tglLokal } from "./kalender-waktu";
import { supabase } from "./supabase";

export type Tujuan = {
  id: string;
  title: string;
  target_outcome: string | null;
  target_date: string | null;
  starting_level: string | null;
  weekly_minutes: number | null;
  completion_criteria: string | null;
  status: string; // active | completed | archived
};

export type TopikRingkas = {
  id: string;
  goal_id: string;
  parent_id: string | null;
  study_status: string; // not_started | in_progress | done
};

export type SesiSelesai = {
  goal_id: string;
  session_date: string;
  actual_minutes: number;
};

export type DataBelajar = {
  tujuan: Tujuan[];
  topik: TopikRingkas[];
  sesi: SesiSelesai[];
};

export type SelHeatmap = {
  tanggal: string;
  menit: number;
  level: number; // 0 sampai 4
  akan: boolean;
  hariIni: boolean;
};

export type RingkasanBelajar = {
  menitMingguIni: number;
  sesiMingguIni: number;
  streakSaatIni: number;
  streakTerpanjang: number;
  heatmap: SelHeatmap[][]; // 12 kolom (minggu), tiap kolom 7 hari (Senin dulu)
  hariAktif: number;
  menitPerTujuan: Map<string, number>;
  topikPerTujuan: Map<string, { total: number; selesai: number }>;
};

const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// "2026-11-12" -> "12 Nov 2026" (dipecah manual supaya tidak bergeser sehari)
export function formatTanggalPendek(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  return `${d} ${BULAN_PENDEK[m - 1]} ${y}`;
}

// Senin dari minggu yang memuat tanggal "hari"
function awalMinggu(hari: string) {
  const d = new Date(`${hari}T00:00:00Z`);
  return tambahHari(hari, -((d.getUTCDay() + 6) % 7));
}

export const JUMLAH_MINGGU = 12;

export function hitungBelajar(
  data: DataBelajar,
  hariIni: string
): RingkasanBelajar {
  const mingguIni = awalMinggu(hariIni);

  const sesiMinggu = data.sesi.filter((s) => s.session_date >= mingguIni);
  const menitMingguIni = sesiMinggu.reduce((a, s) => a + s.actual_minutes, 0);

  const menitPerTanggal = new Map<string, number>();
  const menitPerTujuan = new Map<string, number>();
  for (const s of data.sesi) {
    menitPerTanggal.set(
      s.session_date,
      (menitPerTanggal.get(s.session_date) ?? 0) + s.actual_minutes
    );
    menitPerTujuan.set(
      s.goal_id,
      (menitPerTujuan.get(s.goal_id) ?? 0) + s.actual_minutes
    );
  }

  // Streak saat ini: kalau hari ini belum belajar, tetap hidup selama kemarin belajar
  let streakSaatIni = 0;
  let kursor = menitPerTanggal.has(hariIni) ? hariIni : tambahHari(hariIni, -1);
  while (menitPerTanggal.has(kursor)) {
    streakSaatIni += 1;
    kursor = tambahHari(kursor, -1);
  }

  let streakTerpanjang = 0;
  let deret = 0;
  let sebelumnya = "";
  for (const t of [...menitPerTanggal.keys()].sort()) {
    deret = sebelumnya && tambahHari(sebelumnya, 1) === t ? deret + 1 : 1;
    if (deret > streakTerpanjang) streakTerpanjang = deret;
    sebelumnya = t;
  }

  const awalHeatmap = tambahHari(mingguIni, -(JUMLAH_MINGGU - 1) * 7);
  const heatmap: SelHeatmap[][] = [];
  let hariAktif = 0;
  for (let w = 0; w < JUMLAH_MINGGU; w++) {
    const kolom: SelHeatmap[] = [];
    for (let h = 0; h < 7; h++) {
      const tanggal = tambahHari(awalHeatmap, w * 7 + h);
      const menit = menitPerTanggal.get(tanggal);
      let level = 0;
      if (menit !== undefined) {
        level = menit >= 120 ? 4 : menit >= 60 ? 3 : menit >= 30 ? 2 : 1;
        hariAktif += 1;
      }
      kolom.push({
        tanggal,
        menit: menit ?? 0,
        level,
        akan: tanggal > hariIni,
        hariIni: tanggal === hariIni,
      });
    }
    heatmap.push(kolom);
  }

  // Topik tingkat atas; topik yang punya sub topik selesai kalau semua sub topiknya selesai
  const anakPerTopik = new Map<string, string[]>();
  const statusPerTopik = new Map<string, string>();
  for (const t of data.topik) {
    statusPerTopik.set(t.id, t.study_status);
    if (t.parent_id) {
      anakPerTopik.set(t.parent_id, [
        ...(anakPerTopik.get(t.parent_id) ?? []),
        t.id,
      ]);
    }
  }
  const topikPerTujuan = new Map<string, { total: number; selesai: number }>();
  for (const t of data.topik) {
    if (t.parent_id) continue;
    const anak = anakPerTopik.get(t.id) ?? [];
    const selesai = anak.length
      ? anak.every((a) => statusPerTopik.get(a) === "done")
      : t.study_status === "done";
    const cur = topikPerTujuan.get(t.goal_id) ?? { total: 0, selesai: 0 };
    cur.total += 1;
    if (selesai) cur.selesai += 1;
    topikPerTujuan.set(t.goal_id, cur);
  }

  return {
    menitMingguIni,
    sesiMingguIni: sesiMinggu.length,
    streakSaatIni,
    streakTerpanjang,
    heatmap,
    hariAktif,
    menitPerTujuan,
    topikPerTujuan,
  };
}

export function useBelajar() {
  const { session } = useAuth();
  const idUser = session?.user.id;

  const [hariIni, setHariIni] = useState("");
  const [data, setData] = useState<DataBelajar | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(false);
  const permintaan = useRef(0); // hanya permintaan terbaru yang dipakai

  const muat = useCallback(async () => {
    if (!idUser) return;
    const no = ++permintaan.current;
    try {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("timezone")
        .eq("user_id", idUser)
        .maybeSingle();
      const zona = prefs?.timezone ?? "Asia/Jakarta";

      const [hasilTujuan, hasilTopik, hasilSesi] = await Promise.all([
        supabase
          .from("learning_goals")
          .select(
            "id,title,target_outcome,target_date,starting_level,weekly_minutes,completion_criteria,status"
          )
          .eq("user_id", idUser)
          .order("created_at", { ascending: false }),
        supabase
          .from("learning_topics")
          .select("id,goal_id,parent_id,study_status")
          .eq("user_id", idUser),
        supabase
          .from("study_sessions")
          .select("goal_id,session_date,actual_minutes")
          .eq("user_id", idUser)
          .eq("status", "done"),
      ]);

      if (hasilTujuan.error || hasilTopik.error || hasilSesi.error) {
        if (no === permintaan.current) setGalat(true);
        return;
      }
      if (no !== permintaan.current) return;

      setHariIni(tglLokal(new Date(), zona));
      setData({
        tujuan: (hasilTujuan.data ?? []) as Tujuan[],
        topik: (hasilTopik.data ?? []) as TopikRingkas[],
        sesi: (hasilSesi.data ?? []) as SesiSelesai[],
      });
      setGalat(false);
    } catch {
      if (no === permintaan.current) setGalat(true);
    } finally {
      if (no === permintaan.current) setMemuat(false);
    }
  }, [idUser]);

  const segarkan = useCallback(async () => {
    setMenyegarkan(true);
    await muat();
    setMenyegarkan(false);
  }, [muat]);

  return { hariIni, data, memuat, menyegarkan, galat, muat, segarkan };
}