import { useCallback, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { rentangHariIni } from "./waktu";

const BATAS = 6;

export type Tugas = {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
};

export type Acara = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  status: string;
};

export type Keuangan = {
  pengeluaran: number;
  batas: number | null;
  sisa: number | null;
};

export type DataDashboard = {
  zona: string;
  mataUang: string;
  username: string;
  hariIni: string;
  agenda: Acara[];
  tugasTerlambat: Tugas[];
  tugasHariIni: Tugas[];
  tugasMendatang: Tugas[];
  tugasSelesai: number;
  belajarHariIni: number;
  keuangan: Keuangan;
  galatTugas: boolean;
  galatAgenda: boolean;
};

const angka = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

export function useDashboard() {
  const { session } = useAuth();
  const idUser = session?.user.id;

  const [data, setData] = useState<DataDashboard | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(false);

  const muat = useCallback(async () => {
    if (!idUser) return;
    try {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("timezone, username, base_currency")
        .eq("user_id", idUser)
        .maybeSingle();

      const zona = prefs?.timezone ?? "Asia/Jakarta";
      const { hariIni, mulai, selesai } = rentangHariIni(zona);
      const bulanKeuangan = `${hariIni.slice(0, 7)}-01`;

      const [agenda, tugas, mendatang, selesaiRes, belajar, keu] =
        await Promise.all([
          supabase
            .from("calendar_events")
            .select("id, title, start_at, end_at, all_day, location, status")
            .eq("user_id", idUser)
            .in("status", ["active", "completed"])
            .lt("start_at", selesai)
            .gt("end_at", mulai)
            .order("start_at"),
          supabase
            .from("tasks")
            .select("id, title, priority, due_date, due_time")
            .eq("user_id", idUser)
            .in("status", ["todo", "in_progress"])
            .lte("due_date", hariIni)
            .order("due_date")
            .order("due_time", { nullsFirst: false }),
          supabase
            .from("tasks")
            .select("id, title, priority, due_date, due_time")
            .eq("user_id", idUser)
            .in("status", ["todo", "in_progress"])
            .gt("due_date", hariIni)
            .order("due_date")
            .order("due_time", { nullsFirst: false })
            .limit(BATAS),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", idUser)
            .eq("status", "done"),
          supabase
            .from("study_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", idUser)
            .eq("session_date", hariIni)
            .in("status", ["planned", "running", "done"]),
          supabase.rpc("ringkasan_keuangan_bulan", { p_bulan: bulanKeuangan }),
        ]);

      const daftarTugas = (tugas.data ?? []) as Tugas[];
      const baris = ((keu.data ?? [])[0] ?? null) as {
        pengeluaran?: number | string;
        batas?: number | string | null;
        sisa?: number | string | null;
      } | null;

      setData({
        zona,
        mataUang: prefs?.base_currency ?? "IDR",
        username:
          typeof prefs?.username === "string" ? prefs.username.trim() : "",
        hariIni,
        agenda: (agenda.data ?? []) as Acara[],
        tugasTerlambat: daftarTugas.filter((t) => (t.due_date ?? "") < hariIni),
        tugasHariIni: daftarTugas.filter((t) => t.due_date === hariIni),
        tugasMendatang: (mendatang.data ?? []) as Tugas[],
        tugasSelesai: selesaiRes.count ?? 0,
        belajarHariIni: belajar.count ?? 0,
        keuangan: {
          pengeluaran: angka(baris?.pengeluaran) ?? 0,
          batas: angka(baris?.batas),
          sisa: angka(baris?.sisa),
        },
        galatTugas: Boolean(tugas.error),
        galatAgenda: Boolean(agenda.error),
      });
      setGalat(false);
    } catch {
      setGalat(true);
    } finally {
      setMemuat(false);
    }
  }, [idUser]);

  const segarkan = useCallback(async () => {
    setMenyegarkan(true);
    await muat();
    setMenyegarkan(false);
  }, [muat]);

  return { data, memuat, menyegarkan, galat, muat, segarkan };
}