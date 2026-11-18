import { SITUS_AI } from "./situs";
import { supabase } from "./supabase";

// Bentuknya sama dengan yang dipakai KotakAI di web
export type Usulan = {
  id: string;
  jenis: "tugas" | "acara";
  judul: string;
  lokasi: string;
  prioritas: "low" | "medium" | "high";
  sepanjangHari: boolean;
  mulaiTanggal: string;
  mulaiJam: string;
  selesaiTanggal: string;
  selesaiJam: string;
  asumsi: string[];
  masalah: string | null; // usulan tidak valid
  bentrok: string | null; // usulan bentrok dengan jadwal lain
};

export type HasilUsul =
  | { ok: true; usulan: Usulan[]; catatan: string }
  | { ok: false; pesan: string; perluAktif?: boolean };

export type ItemSimpan = Pick<
  Usulan,
  | "id"
  | "jenis"
  | "judul"
  | "lokasi"
  | "prioritas"
  | "sepanjangHari"
  | "mulaiTanggal"
  | "mulaiJam"
  | "selesaiTanggal"
  | "selesaiJam"
>;

export type HasilSimpan = {
  ok: boolean;
  pesan: string;
  hasil: { id: string; ok: boolean; pesan: string }[];
};

type Kirim =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; pesan: string };

// Gemini di server bisa memakai sampai sekitar 45 detik per model
const BATAS_MS = 70000;

async function kirim(badan: Record<string, unknown>): Promise<Kirim> {
  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi.session?.access_token;
  if (!token) return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };

  const pengendali = new AbortController();
  const waktu = setTimeout(() => pengendali.abort(), BATAS_MS);
  try {
    const res = await fetch(`${SITUS_AI}/api/mobile/ai`, {
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
      return {
        ok: false,
        pesan: "Jawaban server tidak bisa dibaca. Coba lagi.",
      };
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

export async function usulkanDariAI(teks: string): Promise<HasilUsul> {
  const r = await kirim({ aksi: "usulkan", teks });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") {
    return { ok: false, pesan: "Jawaban server tidak dikenal. Coba lagi." };
  }
  return r.data as HasilUsul;
}

export async function aktifkanAI(): Promise<{ ok: boolean; pesan: string }> {
  const r = await kirim({ aksi: "aktifkan" });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") {
    return { ok: false, pesan: "Jawaban server tidak dikenal. Coba lagi." };
  }
  return {
    ok: r.data.ok,
    pesan: typeof r.data.pesan === "string" ? r.data.pesan : "",
  };
}

export async function simpanUsulan(
  daftar: ItemSimpan[]
): Promise<HasilSimpan> {
  const r = await kirim({ aksi: "simpan", daftar });
  if (!r.ok) return { ok: false, pesan: r.pesan, hasil: [] };
  if (typeof r.data.ok !== "boolean" || !Array.isArray(r.data.hasil)) {
    return {
      ok: false,
      pesan: "Jawaban server tidak dikenal. Coba lagi.",
      hasil: [],
    };
  }
  return r.data as HasilSimpan;
}