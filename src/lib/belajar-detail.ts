import { useCallback, useRef, useState } from "react";
import { useAuth } from "./auth";
import type { Tujuan } from "./belajar";
import { tambahHari, tglLokal } from "./kalender-waktu";
import { supabase } from "./supabase";

export type Topik = {
  id: string;
  title: string;
  position: number;
  estimated_minutes: number | null;
  study_status: string; // not_started | in_progress | done
  parent_id: string | null;
};

export type SesiDetail = {
  id: string;
  topic_id: string | null;
  session_date: string;
  start_time: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  elapsed_seconds: number;
  status: string; // planned | running | done | skipped
  timer_started_at: string | null;
  notes: string | null;
};

export type JadwalSesi = {
  tanggal: string;
  jam: string | null;
  menit: number | null;
  status: string;
};

export type NodeAnak = {
  topik: Topik;
  dip: number;
  persen: number;
  jadwal: JadwalSesi[];
};

export type NodeTopik = {
  topik: Topik;
  est: number | null;
  dip: number;
  status: string;
  persen: number;
  anak: NodeAnak[];
  jadwal: JadwalSesi[];
};

// Pilihan topik di form sesi: topik tanpa sub topik, atau sub topik.
// "grup" berisi judul topik induk kalau ini sub topik.
export type OpsiTopikSesi = {
  id: string;
  title: string;
  grup: string | null;
  estimasi: number | null;
  dipelajari: number;
};

export type RingkasanDetail = {
  pohon: NodeTopik[];
  opsiTopik: OpsiTopikSesi[];
  selesai: number;
  persenSelesai: number;
  totalMenit: number;
  totalEstimasi: number;
  sisaEstimasi: number;
  namaLengkap: Map<string, string>;
  berjalan: SesiDetail[];
  akanDatang: SesiDetail[];
  riwayat: SesiDetail[];
};

const bandingJadwal = (a: JadwalSesi, b: JadwalSesi) =>
  `${a.tanggal} ${a.jam ?? ""}`.localeCompare(`${b.tanggal} ${b.jam ?? ""}`);

export function persenProgres(
  est: number | null,
  dip: number,
  status: string
) {
  if (status === "done") return 100;
  if (est == null || est <= 0) return 0;
  return Math.min(100, Math.round((dip / est) * 100));
}

export function hitungDetail(
  topik: Topik[],
  sesi: SesiDetail[]
): RingkasanDetail {
  const utama = topik.filter((t) => !t.parent_id);
  const anakDari = new Map<string, Topik[]>();
  for (const t of topik) {
    if (t.parent_id) {
      anakDari.set(t.parent_id, [...(anakDari.get(t.parent_id) ?? []), t]);
    }
  }

  // Waktu belajar dari sesi selesai, dan jadwal sesi, per topik/sub topik
  const menitPerTopik = new Map<string, number>();
  const sesiPerTopik = new Map<string, JadwalSesi[]>();
  for (const x of sesi) {
    if (!x.topic_id) continue;
    if (x.status === "done") {
      menitPerTopik.set(
        x.topic_id,
        (menitPerTopik.get(x.topic_id) ?? 0) + x.actual_minutes
      );
    }
    sesiPerTopik.set(x.topic_id, [
      ...(sesiPerTopik.get(x.topic_id) ?? []),
      {
        tanggal: x.session_date,
        jam: x.start_time,
        menit: x.planned_minutes,
        status: x.status,
      },
    ]);
  }
  const jadwalDari = (ids: string[]) =>
    ids.flatMap((k) => sesiPerTopik.get(k) ?? []).sort(bandingJadwal);

  const pohon: NodeTopik[] = utama.map((t) => {
    const anak = anakDari.get(t.id) ?? [];

    // Angka topik = total sub topiknya kalau punya sub topik
    let est: number | null = t.estimated_minutes;
    if (anak.length > 0) {
      const ada = anak.filter((a) => a.estimated_minutes != null);
      est =
        ada.length === 0
          ? null
          : ada.reduce((a, x) => a + (x.estimated_minutes ?? 0), 0);
    }

    const dip =
      (menitPerTopik.get(t.id) ?? 0) +
      anak.reduce((a, x) => a + (menitPerTopik.get(x.id) ?? 0), 0);

    // Status topik yang punya sub topik mengikuti sub topiknya
    let status = t.study_status;
    if (anak.length > 0) {
      if (anak.every((a) => a.study_status === "done")) status = "done";
      else if (anak.some((a) => a.study_status !== "not_started"))
        status = "in_progress";
      else status = "not_started";
    }

    return {
      topik: t,
      est,
      dip,
      status,
      persen: persenProgres(est, dip, status),
      anak: anak.map((a) => {
        const dipA = menitPerTopik.get(a.id) ?? 0;
        return {
          topik: a,
          dip: dipA,
          persen: persenProgres(a.estimated_minutes, dipA, a.study_status),
          jadwal: jadwalDari([a.id]),
        };
      }),
      jadwal: jadwalDari([t.id, ...anak.map((a) => a.id)]),
    };
  });

  const selesai = pohon.filter((n) => n.status === "done").length;
  const persenSelesai = pohon.length
    ? Math.round((selesai / pohon.length) * 100)
    : 0;
  const totalMenit = sesi
    .filter((x) => x.status === "done")
    .reduce((a, x) => a + x.actual_minutes, 0);

  let totalEstimasi = 0;
  let sisaEstimasi = 0;
  for (const n of pohon) {
    if (n.est == null) continue;
    totalEstimasi += n.est;
    sisaEstimasi += Math.max(0, n.est - n.dip);
  }

  // Nama lengkap untuk tampilan sesi: "Topik › Sub topik"
  const judulById = new Map(topik.map((t) => [t.id, t.title]));
  const namaLengkap = new Map(
    topik.map((t) => [
      t.id,
      t.parent_id
        ? `${judulById.get(t.parent_id) ?? ""} › ${t.title}`
        : t.title,
    ])
  );

  const opsiTopik: OpsiTopikSesi[] = [];
  for (const n of pohon) {
    if (n.anak.length === 0) {
      opsiTopik.push({
        id: n.topik.id,
        title: n.topik.title,
        grup: null,
        estimasi: n.topik.estimated_minutes,
        dipelajari: n.dip,
      });
    } else {
      for (const a of n.anak) {
        opsiTopik.push({
          id: a.topik.id,
          title: a.topik.title,
          grup: n.topik.title,
          estimasi: a.topik.estimated_minutes,
          dipelajari: a.dip,
        });
      }
    }
  }

  return {
    pohon,
    opsiTopik,
    selesai,
    persenSelesai,
    totalMenit,
    totalEstimasi,
    sisaEstimasi,
    namaLengkap,
    berjalan: sesi.filter((x) => x.status === "running"),
    akanDatang: sesi
      .filter((x) => x.status === "planned")
      .sort((a, b) =>
        `${a.session_date} ${a.start_time ?? ""}`.localeCompare(
          `${b.session_date} ${b.start_time ?? ""}`
        )
      ),
    riwayat: sesi.filter((x) => x.status === "done" || x.status === "skipped"),
  };
}

export function useDetailTujuan(id: string | undefined) {
  const { session } = useAuth();
  const idUser = session?.user.id;

  const [hariIni, setHariIni] = useState("");
  const [tujuan, setTujuan] = useState<Tujuan | null>(null);
  const [topik, setTopik] = useState<Topik[]>([]);
  const [sesi, setSesi] = useState<SesiDetail[]>([]);
  const [lulus, setLulus] = useState<string[]>([]);
  const [tesBerjalan, setTesBerjalan] = useState<string[]>([]);
  const [tesSelesai, setTesSelesai] = useState<string[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(false);
  const [tidakAda, setTidakAda] = useState(false);
  const permintaan = useRef(0); // hanya permintaan terbaru yang dipakai

  const muat = useCallback(async () => {
    if (!idUser || !id) return;
    const no = ++permintaan.current;
    try {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("timezone")
        .eq("user_id", idUser)
        .maybeSingle();
      const zona = prefs?.timezone ?? "Asia/Jakarta";

      const [hasilTujuan, hasilTopik, hasilSesi, hasilLulus] = await Promise.all([
        supabase
          .from("learning_goals")
          .select(
            "id,title,target_outcome,target_date,starting_level,weekly_minutes,completion_criteria,status"
          )
          .eq("id", id)
          .eq("user_id", idUser)
          .maybeSingle(),
        supabase
          .from("learning_topics")
          .select("id,title,position,estimated_minutes,study_status,parent_id")
          .eq("goal_id", id)
          .eq("user_id", idUser)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("study_sessions")
          .select(
            "id,topic_id,session_date,start_time,planned_minutes,actual_minutes,elapsed_seconds,status,timer_started_at,notes"
          )
          .eq("goal_id", id)
          .eq("user_id", idUser)
          .order("session_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("learning_quizzes")
          .select("topic_id, status")
          .eq("goal_id", id)
          .eq("user_id", idUser)
          .in("status", ["passed", "failed", "in_progress"]),
      ]);

      if (hasilTujuan.error || hasilTopik.error || hasilSesi.error) {
        if (no === permintaan.current) setGalat(true);
        return;
      }
      if (no !== permintaan.current) return;

      setHariIni(tglLokal(new Date(), zona));
      if (!hasilTujuan.data) {
        setTidakAda(true);
        setTujuan(null);
      } else {
        setTidakAda(false);
        setTujuan(hasilTujuan.data as Tujuan);
        setTopik((hasilTopik.data ?? []) as Topik[]);
        setSesi((hasilSesi.data ?? []) as SesiDetail[]);
        const kuisTopik = hasilLulus.data ?? [];
        setLulus(
          kuisTopik
            .filter((x) => x.status === "passed")
            .map((x) => x.topic_id as string)
        );
        setTesBerjalan(
          kuisTopik
            .filter((x) => x.status === "in_progress")
            .map((x) => x.topic_id as string)
        );
        setTesSelesai(
          kuisTopik
            .filter((x) => x.status !== "in_progress")
            .map((x) => x.topic_id as string)
        );
      }
      setGalat(false);
    } catch {
      if (no === permintaan.current) setGalat(true);
    } finally {
      if (no === permintaan.current) setMemuat(false);
    }
  }, [idUser, id]);

  const segarkan = useCallback(async () => {
    setMenyegarkan(true);
    await muat();
    setMenyegarkan(false);
  }, [muat]);

  return {
    hariIni,
    tujuan,
    topik,
    sesi,
    lulus,
    tesBerjalan,
    tesSelesai,
    memuat,
    menyegarkan,
    galat,
    tidakAda,
    muat,
    segarkan,
  };
}

export type HariAktivitas = { kunci: string; hari: string; menit: number };

export type AktivitasMingguan = {
  hari: HariAktivitas[];
  menitTertinggi: number;
  total: number;
};

const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Menit belajar (sesi selesai) 7 hari terakhir, hari ini di paling kanan
export function hitungAktivitas(
  sesi: SesiDetail[],
  hariIni: string
): AktivitasMingguan {
  const menitPerTanggal = new Map<string, number>();
  for (const x of sesi) {
    if (x.status === "done") {
      menitPerTanggal.set(
        x.session_date,
        (menitPerTanggal.get(x.session_date) ?? 0) + x.actual_minutes
      );
    }
  }
  const hari = Array.from({ length: 7 }, (_, i) => {
    const kunci = tambahHari(hariIni, i - 6);
    const dow = new Date(`${kunci}T00:00:00Z`).getUTCDay();
    return {
      kunci,
      hari: HARI_PENDEK[dow],
      menit: menitPerTanggal.get(kunci) ?? 0,
    };
  });
  return {
    hari,
    menitTertinggi: Math.max(0, ...hari.map((h) => h.menit)),
    total: hari.reduce((a, h) => a + h.menit, 0),
  };
}

// Sisa hari menuju tanggal target (negatif = sudah lewat)
export function sisaHariKe(target: string, hariIni: string) {
  return Math.round(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) /
      86400000
  );
}