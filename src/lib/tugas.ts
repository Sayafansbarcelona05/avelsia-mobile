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

export type HasilUbah = {
  ok: boolean;
  pesan: string;
  bentrok?: boolean;
};

export type MasukanTugas = {
  judul: string;
  prioritas: string;
  mulaiTanggal: string;
  mulaiJam: string;
  selesaiTanggal: string;
  selesaiJam: string;
};

const PRIORITAS = ["low", "medium", "high"];

function tanggalValid(t: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const cek = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(cek.getTime()) && cek.toISOString().slice(0, 10) === t;
}

function jamValid(j: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(j);
}

// Mengembalikan pesan kesalahan, atau null kalau semua valid
export function periksaTugas(n: MasukanTugas): string | null {
  if (n.judul.length < 1 || n.judul.length > 200) {
    return "Judul wajib diisi, maksimal 200 karakter.";
  }
  if (!PRIORITAS.includes(n.prioritas)) return "Prioritas tidak valid.";
  if (!n.mulaiTanggal) return "Tanggal mulai wajib diisi.";
  if (!n.mulaiJam) return "Jam mulai wajib diisi.";
  if (!n.selesaiTanggal) return "Tanggal selesai wajib diisi.";
  if (!n.selesaiJam) return "Jam selesai wajib diisi.";
  if (!tanggalValid(n.selesaiTanggal)) return "Tanggal selesai tidak valid.";
  if (!tanggalValid(n.mulaiTanggal)) return "Tanggal mulai tidak valid.";
  if (!jamValid(n.selesaiJam)) return "Jam selesai tidak valid.";
  if (!jamValid(n.mulaiJam)) return "Jam mulai tidak valid.";
  if (n.mulaiTanggal > n.selesaiTanggal) {
    return "Tanggal mulai tidak boleh setelah tanggal selesai.";
  }
  if (n.mulaiTanggal === n.selesaiTanggal && n.mulaiJam >= n.selesaiJam) {
    return "Jam selesai harus setelah jam mulai.";
  }
  return null;
}

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

  const ubahStatus = useCallback(
    async (id: string, status: string): Promise<HasilUbah> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      const sekarang = new Date().toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status,
          completed_at: status === "done" ? sekarang : null,
          updated_at: sekarang,
        })
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        await muat();
        const awal = "BENTROK: ";
        if (error.message.startsWith(awal)) {
          return {
            ok: false,
            bentrok: true,
            pesan: error.message.slice(awal.length),
          };
        }
        return { ok: false, pesan: "Status tugas gagal diubah. Coba lagi." };
      }
      if (!data || data.length === 0) {
        await muat();
        return { ok: false, pesan: "Tugas tidak ditemukan." };
      }

      setTugas((prev) =>
        prev
          ? prev.map((t) =>
              t.id === id ? { ...t, status, updated_at: sekarang } : t
            )
          : prev
      );
      return { ok: true, pesan: "Status tugas diperbarui." };
    },
    [idUser, muat]
  );
  const tambahTugas = useCallback(
    async (n: MasukanTugas): Promise<HasilUbah> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      const salah = periksaTugas(n);
      if (salah) return { ok: false, pesan: salah };

      const { error } = await supabase.from("tasks").insert({
        title: n.judul,
        priority: n.prioritas,
        due_date: n.selesaiTanggal,
        due_time: n.selesaiJam,
        start_date: n.mulaiTanggal,
        start_time: n.mulaiJam,
        source: "manual",
      });

      if (error) {
        const awal = "BENTROK: ";
        if (error.message.startsWith(awal)) {
          return {
            ok: false,
            bentrok: true,
            pesan: error.message.slice(awal.length),
          };
        }
        return { ok: false, pesan: "Tugas gagal disimpan. Coba lagi." };
      }

      await muat();
      return { ok: true, pesan: "Tugas tersimpan." };
    },
    [idUser, muat]
  );

  const ubahTugas = useCallback(
    async (id: string, n: MasukanTugas): Promise<HasilUbah> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      if (!id) return { ok: false, pesan: "Tugas tidak ditemukan." };
      const salah = periksaTugas(n);
      if (salah) return { ok: false, pesan: salah };

      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: n.judul,
          priority: n.prioritas,
          due_date: n.selesaiTanggal,
          due_time: n.selesaiJam,
          start_date: n.mulaiTanggal,
          start_time: n.mulaiJam,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        const awal = "BENTROK: ";
        if (error.message.startsWith(awal)) {
          return {
            ok: false,
            bentrok: true,
            pesan: error.message.slice(awal.length),
          };
        }
        return { ok: false, pesan: "Tugas gagal diperbarui. Coba lagi." };
      }
      if (!data || data.length === 0) {
        return { ok: false, pesan: "Tugas tidak ditemukan." };
      }

      await muat();
      return { ok: true, pesan: "Tugas diperbarui." };
    },
    [idUser, muat]
  );

  const hapusTugas = useCallback(
    async (id: string): Promise<HasilUbah> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        return { ok: false, pesan: "Tugas gagal dihapus. Coba lagi." };
      }
      if (!data || data.length === 0) {
        return {
          ok: false,
          pesan: "Tugas tidak ditemukan atau tidak bisa dihapus.",
        };
      }
      setTugas((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      return { ok: true, pesan: "Tugas dihapus." };
    },
    [idUser]
  );

  return {
    tugas,
    hariIni,
    memuat,
    menyegarkan,
    galat,
    muat,
    segarkan,
    ubahStatus,
    tambahTugas,
    hapusTugas,
    ubahTugas,
  };
}