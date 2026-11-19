import { useCallback, useRef, useState } from "react";
import { useAuth } from "./auth";
import {
  formatLokal,
  jamLokal,
  jamValid,
  pad,
  tambahHari,
  tanggalValid,
  tglLokal,
  zonaKeUtc,
} from "./kalender-waktu";
import { supabase } from "./supabase";

export type Acara = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  status: string;
};

export type TugasKal = {
  id: string;
  title: string;
  priority: string;
  status: string;
  start_date: string | null;
  start_time: string | null;
  due_date: string | null;
  due_time: string | null;
};

export type Sesi = {
  id: string;
  goal_id: string;
  topic_id: string | null;
  session_date: string;
  start_time: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  elapsed_seconds: number;
  status: string;
};

export type DataBulan = {
  kodeBulan: string;
  acaraPerHari: Map<string, Acara[]>;
  tugasPerHari: Map<string, TugasKal[]>;
  sesiPerHari: Map<string, Sesi[]>;
  judulTopik: Map<string, string>;
  judulTujuan: Map<string, string>;
};

// Nilai awal form edit (waktu lokal), dipakai di langkah edit nanti
export type AcaraForm = {
  id: string;
  title: string;
  location: string;
  sepanjangHari: boolean;
  mulaiTanggal: string;
  mulaiJam: string;
  selesaiTanggal: string;
  selesaiJam: string;
};

export type MasukanAcara = {
  judul: string;
  lokasi: string;
  sepanjangHari: boolean;
  mulaiTanggal: string;
  mulaiJam: string;
  selesaiTanggal: string;
  selesaiJam: string;
};

export type HasilAcara = { ok: boolean; pesan: string; bentrok?: boolean };

// Mengembalikan waktu mulai dan selesai (UTC), atau pesan kesalahan
function hitungWaktu(
  n: MasukanAcara,
  tz: string
): { mulai: Date; selesai: Date } | string {
  if (n.judul.length < 1 || n.judul.length > 200) {
    return "Judul wajib diisi, maksimal 200 karakter.";
  }
  if (n.lokasi.length > 300) return "Lokasi maksimal 300 karakter.";
  if (!n.mulaiTanggal) return "Tanggal mulai wajib diisi.";
  if (!tanggalValid(n.mulaiTanggal)) return "Tanggal mulai tidak valid.";
  if (!n.selesaiTanggal) return "Tanggal selesai wajib diisi.";
  if (!tanggalValid(n.selesaiTanggal)) return "Tanggal selesai tidak valid.";

  if (n.sepanjangHari) {
    if (n.selesaiTanggal < n.mulaiTanggal) {
      return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    }
    // Sepanjang hari: dari 00:00 hari mulai sampai 00:00 setelah hari selesai
    return {
      mulai: zonaKeUtc(n.mulaiTanggal, "00:00", tz),
      selesai: zonaKeUtc(tambahHari(n.selesaiTanggal, 1), "00:00", tz),
    };
  }

  if (!n.mulaiJam) return "Jam mulai wajib diisi.";
  if (!jamValid(n.mulaiJam)) return "Jam mulai tidak valid.";
  if (!n.selesaiJam) return "Jam selesai wajib diisi.";
  if (!jamValid(n.selesaiJam)) return "Jam selesai tidak valid.";

  const mulai = zonaKeUtc(n.mulaiTanggal, n.mulaiJam, tz);
  const selesai = zonaKeUtc(n.selesaiTanggal, n.selesaiJam, tz);
  if (selesai.getTime() <= mulai.getTime()) {
    return "Waktu selesai harus setelah waktu mulai.";
  }
  return { mulai, selesai };
}

// Mengembalikan pesan kesalahan, atau null kalau semua valid
export function periksaAcara(n: MasukanAcara, tz: string): string | null {
  const w = hitungWaktu(n, tz);
  return typeof w === "string" ? w : null;
}

// Menerjemahkan error bentrok dari database menjadi pesan yang jelas
async function pesanBentrokAcara(
  error: { code?: string; message: string },
  userId: string,
  mulai: Date,
  selesai: Date,
  tz: string,
  kecualiId?: string
): Promise<string | null> {
  const awal = "BENTROK: ";
  if (error.message.startsWith(awal)) return error.message.slice(awal.length);

  // 23P01 = constraint anti-tumpang-tindih antar acara
  if (error.code === "23P01") {
    let q = supabase
      .from("calendar_events")
      .select("title,start_at,end_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("all_day", false)
      .lt("start_at", selesai.toISOString())
      .gt("end_at", mulai.toISOString())
      .limit(1);
    if (kecualiId) q = q.neq("id", kecualiId);
    const { data } = await q;
    const lain = data?.[0];
    if (lain) {
      return `Bentrok dengan acara "${lain.title}" (${formatLokal(new Date(lain.start_at), tz)} sampai ${formatLokal(new Date(lain.end_at), tz)}).`;
    }
    return "Bentrok dengan acara lain di jadwalmu.";
  }
  return null;
}

function tambahKe<T>(peta: Map<string, T[]>, kunci: string, nilai: T) {
  const daftar = peta.get(kunci);
  if (daftar) daftar.push(nilai);
  else peta.set(kunci, [nilai]);
}

export function useKalender() {
  const { session } = useAuth();
  const idUser = session?.user.id;

  const [tz, setTz] = useState("Asia/Jakarta");
  const [hariIni, setHariIni] = useState("");
  const [data, setData] = useState<DataBulan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState(false);
  const permintaan = useRef(0); // hanya permintaan terbaru yang dipakai

  // bulanDiminta: "YYYY-MM", atau null untuk bulan ini
  const muat = useCallback(
    async (bulanDiminta: string | null) => {
      if (!idUser) return;
      const no = ++permintaan.current;
      try {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("timezone")
          .eq("user_id", idUser)
          .maybeSingle();
        const zona = prefs?.timezone ?? "Asia/Jakarta";
        const hari = tglLokal(new Date(), zona);

        const kodeBulan = bulanDiminta ?? hari.slice(0, 7);
        const tahun = Number(kodeBulan.slice(0, 4));
        const bulan = Number(kodeBulan.slice(5, 7));
        const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
        const awalBulan = `${kodeBulan}-01`;
        const akhirBulan = `${kodeBulan}-${pad(jumlahHari)}`;

        // Sedikit lebih lebar dari bulan ini supaya aman untuk zona waktu apa pun
        const batasAwalUtc = `${tambahHari(awalBulan, -1)}T00:00:00Z`;
        const batasAkhirUtc = `${tambahHari(akhirBulan, 2)}T00:00:00Z`;

        const [hasilAcara, hasilTugas, hasilSesi] = await Promise.all([
          supabase
            .from("calendar_events")
            .select("id,title,start_at,end_at,all_day,location,status")
            .eq("user_id", idUser)
            .in("status", ["active", "completed"])
            .lt("start_at", batasAkhirUtc)
            .gt("end_at", batasAwalUtc)
            .order("start_at")
            .limit(500),
          supabase
            .from("tasks")
            .select(
              "id,title,priority,status,start_date,start_time,due_date,due_time"
            )
            .eq("user_id", idUser)
            .or(
              `and(due_date.gte.${awalBulan},due_date.lte.${akhirBulan}),` +
                `and(start_date.gte.${awalBulan},start_date.lte.${akhirBulan}),` +
                `and(start_date.lte.${awalBulan},due_date.gte.${akhirBulan})`
            )
            .limit(500),
          supabase
            .from("study_sessions")
            .select(
              "id,goal_id,topic_id,session_date,start_time,planned_minutes,actual_minutes,elapsed_seconds,status"
            )
            .eq("user_id", idUser)
            .in("status", ["planned", "running", "done"])
            .gte("session_date", awalBulan)
            .lte("session_date", akhirBulan)
            .order("start_time", { nullsFirst: false })
            .order("created_at")
            .limit(500),
        ]);

        if (hasilAcara.error || hasilTugas.error || hasilSesi.error) {
          if (no === permintaan.current) setGalat(true);
          return;
        }

        const acaraPerHari = new Map<string, Acara[]>();
        const tugasPerHari = new Map<string, TugasKal[]>();
        const sesiPerHari = new Map<string, Sesi[]>();

        // Acara: dicatat di setiap hari yang dilaluinya (dalam bulan ini)
        for (const a of (hasilAcara.data ?? []) as Acara[]) {
          const mulai = tglLokal(new Date(a.start_at), zona);
          const selesaiDate = new Date(a.end_at);
          let selesai = tglLokal(selesaiDate, zona);
          if (selesai > mulai && jamLokal(selesaiDate, zona) === "00:00") {
            selesai = tambahHari(selesai, -1); // berakhir tepat tengah malam
          }
          const dari = mulai > awalBulan ? mulai : awalBulan;
          const sampai = selesai < akhirBulan ? selesai : akhirBulan;
          for (
            let t = dari, n = 0;
            t <= sampai && n < 62;
            t = tambahHari(t, 1), n++
          ) {
            tambahKe(acaraPerHari, t, a);
          }
        }

        // Tugas: dicatat di setiap hari dari tanggal mulai sampai tanggal selesai
        for (const t of (hasilTugas.data ?? []) as TugasKal[]) {
          const mulai = t.start_date ?? t.due_date;
          let selesai = t.due_date ?? t.start_date;
          if (!mulai || !selesai) continue;
          if (selesai < mulai) selesai = mulai;
          const dari = mulai > awalBulan ? mulai : awalBulan;
          const sampai = selesai < akhirBulan ? selesai : akhirBulan;
          for (
            let d = dari, n = 0;
            d <= sampai && n < 62;
            d = tambahHari(d, 1), n++
          ) {
            tambahKe(tugasPerHari, d, t);
          }
        }

        // Sesi belajar: session_date sudah berupa tanggal murni
        const daftarSesi = (hasilSesi.data ?? []) as Sesi[];
        for (const s of daftarSesi) tambahKe(sesiPerHari, s.session_date, s);

        // Nama topik dan tujuan belajar untuk sesi di bulan ini
        const idTopik = [
          ...new Set(
            daftarSesi.map((s) => s.topic_id).filter((x): x is string => !!x)
          ),
        ];
        const idTujuan = [...new Set(daftarSesi.map((s) => s.goal_id))];
        const [hasilTopik, hasilTujuan] = await Promise.all([
          idTopik.length > 0
            ? supabase.from("learning_topics").select("id,title").in("id", idTopik)
            : null,
          idTujuan.length > 0
            ? supabase.from("learning_goals").select("id,title").in("id", idTujuan)
            : null,
        ]);
        const judulTopik = new Map<string, string>();
        for (const r of hasilTopik?.data ?? []) judulTopik.set(r.id, r.title);
        const judulTujuan = new Map<string, string>();
        for (const r of hasilTujuan?.data ?? []) judulTujuan.set(r.id, r.title);

        if (no !== permintaan.current) return;
        setTz(zona);
        setHariIni(hari);
        setData({
          kodeBulan,
          acaraPerHari,
          tugasPerHari,
          sesiPerHari,
          judulTopik,
          judulTujuan,
        });
        setGalat(false);
      } catch {
        if (no === permintaan.current) setGalat(true);
      } finally {
        if (no === permintaan.current) setMemuat(false);
      }
    },
    [idUser]
  );

  const segarkan = useCallback(
    async (bulanDiminta: string | null) => {
      setMenyegarkan(true);
      await muat(bulanDiminta);
      setMenyegarkan(false);
    },
    [muat]
  );

  const tambahAcara = useCallback(
    async (
      n: MasukanAcara,
      bulanSekarang: string | null
    ): Promise<HasilAcara> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      const waktu = hitungWaktu(n, tz);
      if (typeof waktu === "string") return { ok: false, pesan: waktu };

      const { error } = await supabase.from("calendar_events").insert({
        title: n.judul,
        location: n.lokasi || null,
        start_at: waktu.mulai.toISOString(),
        end_at: waktu.selesai.toISOString(),
        all_day: n.sepanjangHari,
        timezone: tz,
        source: "manual",
      });

      if (error) {
        const pesan = await pesanBentrokAcara(
          error,
          idUser,
          waktu.mulai,
          waktu.selesai,
          tz
        );
        if (pesan) return { ok: false, pesan, bentrok: true };
        return { ok: false, pesan: "Acara gagal disimpan. Coba lagi." };
      }

      await muat(bulanSekarang);
      return { ok: true, pesan: "Acara tersimpan." };
    },
    [idUser, tz, muat]
  );

  const ubahStatusAcara = useCallback(
    async (
      id: string,
      status: "active" | "completed",
      bulanSekarang: string | null
    ): Promise<HasilAcara> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }

      // Waktu acara dibutuhkan untuk pesan bentrok kalau dibuka kembali
      const { data: acara } = await supabase
        .from("calendar_events")
        .select("start_at,end_at")
        .eq("id", id)
        .eq("user_id", idUser)
        .maybeSingle();
      if (!acara) return { ok: false, pesan: "Acara tidak ditemukan." };

      const { data, error } = await supabase
        .from("calendar_events")
        .update({ status })
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        const pesan = await pesanBentrokAcara(
          error,
          idUser,
          new Date(acara.start_at),
          new Date(acara.end_at),
          tz,
          id
        );
        if (pesan) return { ok: false, pesan, bentrok: true };
        return { ok: false, pesan: "Status acara gagal diubah. Coba lagi." };
      }
      if (!data || data.length === 0) {
        return { ok: false, pesan: "Acara tidak ditemukan." };
      }

      await muat(bulanSekarang);
      return { ok: true, pesan: "Status acara diperbarui." };
    },
    [idUser, tz, muat]
  );

  const ubahAcara = useCallback(
    async (
      id: string,
      n: MasukanAcara,
      bulanSekarang: string | null
    ): Promise<HasilAcara> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      if (!id) return { ok: false, pesan: "Acara tidak ditemukan." };

      const waktu = hitungWaktu(n, tz);
      if (typeof waktu === "string") return { ok: false, pesan: waktu };

      const { data, error } = await supabase
        .from("calendar_events")
        .update({
          title: n.judul,
          location: n.lokasi || null,
          start_at: waktu.mulai.toISOString(),
          end_at: waktu.selesai.toISOString(),
          all_day: n.sepanjangHari,
          timezone: tz,
        })
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        const pesan = await pesanBentrokAcara(
          error,
          idUser,
          waktu.mulai,
          waktu.selesai,
          tz,
          id
        );
        if (pesan) return { ok: false, pesan, bentrok: true };
        return { ok: false, pesan: "Acara gagal diperbarui. Coba lagi." };
      }
      if (!data || data.length === 0) {
        return { ok: false, pesan: "Acara tidak ditemukan." };
      }

      void muat(bulanSekarang);
      return { ok: true, pesan: "Acara diperbarui." };
    },
    [idUser, tz, muat]
  );

  const hapusAcara = useCallback(
    async (id: string, bulanSekarang: string | null): Promise<HasilAcara> => {
      if (!idUser) {
        return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };
      }
      if (!id) return { ok: false, pesan: "Acara tidak ditemukan." };

      const { data, error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id)
        .eq("user_id", idUser)
        .select("id");

      if (error) {
        return { ok: false, pesan: "Acara gagal dihapus. Coba lagi." };
      }
      if (!data || data.length === 0) {
        return {
          ok: false,
          pesan: "Acara tidak ditemukan atau tidak bisa dihapus.",
        };
      }

      await muat(bulanSekarang);
      return { ok: true, pesan: "Acara dihapus." };
    },
    [idUser, muat]
  );
  return {
    tz,
    hariIni,
    data,
    memuat,
    menyegarkan,
    galat,
    muat,
    segarkan,
    tambahAcara,
    ubahStatusAcara,
    ubahAcara,
    hapusAcara,
  };
}