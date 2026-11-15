import { useCallback, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { rentangHariIni } from "./waktu";

export type TugasItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  start_time: string | null;
  due_date: string | null;
  due_time: string | null;
  updated_at: string | null;
};

export function useDaftarTugas() {
  const { session } = useAuth();
  const idUser = session?.user.id;

  const [tugas, setTugas] = useState<TugasItem[] | null>(null);
  const [hariIni, setHariIni] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(false);

  const muat = useCallback(async () => {
    if (!idUser) return;
    try {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("timezone")
        .eq("user_id", idUser)
        .maybeSingle();

      const zona = prefs?.timezone ?? "Asia/Jakarta";
      setHariIni(rentangHariIni(zona).hariIni);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, start_date, start_time, due_date, due_time, updated_at"
        )
        .eq("user_id", idUser)
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false })
        .limit(500);

      if (error) {
        setGalat(true);
        return;
      }
      setTugas((data ?? []) as TugasItem[]);
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

  return { tugas, hariIni, memuat, menyegarkan, galat, muat, segarkan };
}