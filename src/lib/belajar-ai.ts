import { SITUS_AI } from "./situs";
import { supabase } from "./supabase";

/* ====== Tipe (sama dengan ai-belajar-actions.ts di web) ====== */

export type RefAI = {
  judul: string;
  jenis: string;
  catatan: string;
  tautan: string; // kosong kalau tidak ada atau gagal diperiksa
};

export type SubAI = { kid: string; judul: string; menit: number; ref: RefAI[] };

export type TopikAI = {
  kid: string;
  judul: string;
  menit: number | null; // null kalau punya sub topik
  sub: SubAI[];
  ref: RefAI[]; // kosong kalau punya sub topik
};

export type PayloadTopik = {
  kid: string;
  judul: string;
  menit: number | null;
  ref?: RefAI[];
  sub: { kid: string; judul: string; menit: number; ref?: RefAI[] }[];
};

export type UsulanTujuan = {
  judul: string;
  target: string;
  tanggal: string; // YYYY-MM-DD atau ""
  level: string; // pemula | menengah | mahir
  menit: string; // angka atau ""
  kriteria: string;
  asumsi: string[];
};

export type PayloadTujuan = {
  judul: string;
  target: string;
  tanggal: string;
  level: string;
  menit: string;
  kriteria: string;
  topik: PayloadTopik[];
};

export type HasilTujuanAI =
  | { ok: true; tujuan: UsulanTujuan; topik: TopikAI[]; catatan: string }
  | { ok: false; pesan: string; perluAktif?: boolean };

export type HasilTopikAI =
  | { ok: true; topik: TopikAI[]; catatan: string }
  | { ok: false; pesan: string; perluAktif?: boolean };

export type HasilPecahAI =
  | { ok: true; sub: SubAI[]; estimasi: number | null; catatan: string }
  | { ok: false; pesan: string; perluAktif?: boolean };

export type HasilSimpanTujuan =
  | { ok: true; topik: number; goalId: string; idTopik: Record<string, string> }
  | { ok: false; pesan: string };

/* ====== Pemanggil server ====== */

type Kirim =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; pesan: string };

// Gemini ditambah pemeriksaan tautan di server bisa memakan waktu lama
const BATAS_MS = 100000;

async function kirim(badan: Record<string, unknown>): Promise<Kirim> {
  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi.session?.access_token;
  if (!token) return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };

  const pengendali = new AbortController();
  const waktu = setTimeout(() => pengendali.abort(), BATAS_MS);
  try {
    const res = await fetch(`${SITUS_AI}/api/mobile/belajar-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(badan),
      signal: pengendali.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (typeof data !== "object" || data === null) {
      return { ok: false, pesan: "Jawaban server tidak bisa dibaca. Coba lagi." };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      pesan: pengendali.signal.aborted
        ? "AI terlalu lama menjawab. Coba lagi."
        : "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
    };
  } finally {
    clearTimeout(waktu);
  }
}

const tidakDikenal = { ok: false as const, pesan: "Jawaban server tidak dikenal. Coba lagi." };

export async function susunTujuanAI(kalimat: string): Promise<HasilTujuanAI> {
  const r = await kirim({ aksi: "susunTujuan", kalimat });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilTujuanAI;
}

export async function simpanTujuanAI(muatan: PayloadTujuan): Promise<HasilSimpanTujuan> {
  const r = await kirim({ aksi: "simpanTujuan", muatan });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilSimpanTujuan;
}

export async function susunTopikAI(goalId: string): Promise<HasilTopikAI> {
  const r = await kirim({ aksi: "susunTopik", goalId });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilTopikAI;
}

export async function susunPecahanAI(
  goalId: string,
  topikId: string
): Promise<HasilPecahAI> {
  const r = await kirim({ aksi: "susunPecahan", goalId, topikId });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilPecahAI;
}

/* ====== Jadwal ikut disusun (tujuan baru dengan jadwal) ====== */

export type FormRencana = {
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  durasi: number; // menit maksimal tiap sesi
  maksHari: number; // menit maksimal belajar per hari
};

export type SesiUsulan = {
  kid: string;
  target: string;
  namaTarget: string;
  tanggal: string;
  jam: string;
  menit: number;
};

export type DrafTujuan = {
  judul: string;
  target: string;
  tanggal: string;
  level: string;
  menit: string;
  topik: {
    kid: string;
    judul: string;
    menit: number | null;
    sub: { kid: string; judul: string; menit: number }[];
  }[];
};

export type HasilJadwalTujuan =
  | {
      ok: true;
      sesi: SesiUsulan[];
      belumTerjadwal: { nama: string; menit: number }[];
      catatan: string;
      awal: string;
      akhir: string;
    }
  | { ok: false; pesan: string; perluAktif?: boolean };

export type PayloadJadwalTujuan = {
  durasi: number;
  maksHari: number;
  sesi: {
    kid: string;
    target: string;
    tanggal: string;
    jam: string;
    menit: number;
  }[];
};

export type HasilSimpanTujuanJadwal =
  | { ok: true; topik: number; sesi: number }
  | { ok: false; pesan: string; masalah?: { kid: string; pesan: string }[] };

export type PayloadSimpanRencana = {
  goalId: string;
  durasi: number;
  maksHari: number;
  topikBaru: PayloadTopik[];
  tambahan: {
    kid: string;
    indukId: string;
    sub: { kid: string; judul: string; menit: number; ref?: RefAI[] }[];
  }[];
  sesi: {
    kid: string;
    target: string;
    tanggal: string;
    jam: string;
    menit: number;
  }[];
};

export type HasilSimpanRencana =
  | { ok: true; topik: number; sesi: number }
  | { ok: false; pesan: string; masalah?: { kid: string; pesan: string }[] };

export async function simpanRencanaAI(
  muatan: PayloadSimpanRencana
): Promise<HasilSimpanRencana> {
  const r = await kirim({ aksi: "simpanRencana", muatan });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilSimpanRencana;
}

export async function susunJadwalAI(
  draf: DrafTujuan,
  form: FormRencana
): Promise<HasilJadwalTujuan> {
  const r = await kirim({ aksi: "susunJadwal", draf, form });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilJadwalTujuan;
}

export async function simpanTujuanJadwalAI(
  muatan: PayloadTujuan,
  jadwal: PayloadJadwalTujuan
): Promise<HasilSimpanTujuanJadwal> {
  const r = await kirim({ aksi: "simpanTujuanJadwal", muatan, jadwal });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return r.data as HasilSimpanTujuanJadwal;
}