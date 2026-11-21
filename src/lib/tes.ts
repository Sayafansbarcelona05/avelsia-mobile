import { SITUS_AI } from "./situs";
import { supabase } from "./supabase";

/* ====== Tipe (bentuknya sama dengan tes-actions.ts di web) ====== */

export type PilihanTes = { id: string; teks: string };
export type SoalTes = { id: string; pertanyaan: string; pilihan: PilihanTes[] };

export type KuisBerjalan = {
  id: string;
  passPercent: number;
  pelanggaran: number;
  soal: SoalTes[];
  jawaban: Record<string, string>;
};

export type SoalHasil = SoalTes & {
  jawabanmu: string | null;
  benar: string;
  penjelasan: string;
};

export type DataHasil = {
  status: "passed" | "failed";
  benar: number | null; // null = tes dihentikan karena pelanggaran (tidak dinilai)
  total: number;
  skor: number | null;
  lulusPersen: number;
  pelanggaran: number;
  soal: SoalHasil[];
};

export type HasilMulai =
  | { ok: true; lanjut: boolean }
  | { ok: false; pesan: string };

export type HasilPelanggaran =
  | { ok: true; pelanggaran: number; gagal: boolean }
  | { ok: false; pesan: string };

export type HasilKumpul =
  | { ok: true; lulus: boolean; benar: number; total: number; skor: number }
  | { ok: false; pesan: string };

/* ====== Pemanggil server ====== */

type Kirim =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; pesan: string };

// Membuat soal oleh Gemini bisa sampai 90 detik di server
const BATAS_BIASA_MS = 30000;
const BATAS_MULAI_MS = 100000;

async function kirim(
  badan: Record<string, unknown>,
  batasMs = BATAS_BIASA_MS
): Promise<Kirim> {
  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi.session?.access_token;
  if (!token) return { ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." };

  const pengendali = new AbortController();
  const waktu = setTimeout(() => pengendali.abort(), batasMs);
  try {
    const res = await fetch(`${SITUS_AI}/api/mobile/tes`, {
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
        ? "Server terlalu lama menjawab. Coba lagi."
        : "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
    };
  } finally {
    clearTimeout(waktu);
  }
}

const tidakDikenal = { ok: false as const, pesan: "Jawaban server tidak dikenal. Coba lagi." };

/* ====== Aksi ====== */

export async function mulaiTes(
  topicId: string,
  goalId: string,
  setuju: boolean
): Promise<HasilMulai> {
  const r = await kirim({ aksi: "mulai", topicId, goalId, setuju }, BATAS_MULAI_MS);
  if (!r.ok) return r;
  if (r.data.ok === true && typeof r.data.lanjut === "boolean") {
    return { ok: true, lanjut: r.data.lanjut };
  }
  if (r.data.ok === false && typeof r.data.pesan === "string") {
    return { ok: false, pesan: r.data.pesan };
  }
  return tidakDikenal;
}

export async function simpanJawabanTes(
  kuisId: string,
  jawaban: Record<string, string>
): Promise<{ ok: boolean; pesan: string }> {
  const r = await kirim({ aksi: "jawab", kuisId, jawaban });
  if (!r.ok) return r;
  if (typeof r.data.ok !== "boolean") return tidakDikenal;
  return {
    ok: r.data.ok,
    pesan: typeof r.data.pesan === "string" ? r.data.pesan : "",
  };
}

export async function catatPelanggaranTes(kuisId: string): Promise<HasilPelanggaran> {
  const r = await kirim({ aksi: "pelanggaran", kuisId });
  if (!r.ok) return r;
  if (
    r.data.ok === true &&
    typeof r.data.pelanggaran === "number" &&
    typeof r.data.gagal === "boolean"
  ) {
    return { ok: true, pelanggaran: r.data.pelanggaran, gagal: r.data.gagal };
  }
  if (r.data.ok === false && typeof r.data.pesan === "string") {
    return { ok: false, pesan: r.data.pesan };
  }
  return tidakDikenal;
}

export async function kumpulkanTes(
  kuisId: string,
  jawaban: Record<string, string>
): Promise<HasilKumpul> {
  const r = await kirim({ aksi: "kumpul", kuisId, jawaban });
  if (!r.ok) return r;
  const d = r.data;
  if (
    d.ok === true &&
    typeof d.lulus === "boolean" &&
    typeof d.benar === "number" &&
    typeof d.total === "number" &&
    typeof d.skor === "number"
  ) {
    return { ok: true, lulus: d.lulus, benar: d.benar, total: d.total, skor: d.skor };
  }
  if (d.ok === false && typeof d.pesan === "string") {
    return { ok: false, pesan: d.pesan };
  }
  return tidakDikenal;
}

// Hasil dan pembahasan wajib lewat server: kunci jawaban hanya terbaca di sana
export async function ambilHasilTes(
  topicId: string,
  goalId: string
): Promise<{ ok: true; hasil: DataHasil | null } | { ok: false; pesan: string }> {
  const r = await kirim({ aksi: "hasil", topicId, goalId });
  if (!r.ok) return r;
  if (r.data.ok !== true) {
    return {
      ok: false,
      pesan: typeof r.data.pesan === "string" ? r.data.pesan : tidakDikenal.pesan,
    };
  }
  return { ok: true, hasil: (r.data.hasil ?? null) as DataHasil | null };
}

/* ====== Tes yang sedang berjalan (dibaca langsung, tanpa kunci) ====== */

function bacaSoal(mentah: unknown): SoalTes[] {
  if (!Array.isArray(mentah)) return [];
  const hasil: SoalTes[] = [];
  for (const s of mentah) {
    if (typeof s !== "object" || s === null) continue;
    const o = s as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.pertanyaan !== "string") continue;
    if (!Array.isArray(o.pilihan)) continue;
    const pilihan: PilihanTes[] = [];
    for (const p of o.pilihan) {
      if (typeof p !== "object" || p === null) continue;
      const po = p as Record<string, unknown>;
      if (typeof po.id === "string" && typeof po.teks === "string") {
        pilihan.push({ id: po.id, teks: po.teks });
      }
    }
    hasil.push({ id: o.id, pertanyaan: o.pertanyaan, pilihan });
  }
  return hasil;
}

function bacaJawaban(mentah: unknown): Record<string, string> {
  if (typeof mentah !== "object" || mentah === null || Array.isArray(mentah)) {
    return {};
  }
  const hasil: Record<string, string> = {};
  for (const [k, v] of Object.entries(mentah)) {
    if (typeof v === "string") hasil[k] = v;
  }
  return hasil;
}

export async function ambilKuisBerjalan(topicId: string): Promise<KuisBerjalan | null> {
  const { data } = await supabase
    .from("learning_quizzes")
    .select("id, pass_percent, questions, answers, violations")
    .eq("topic_id", topicId)
    .eq("status", "in_progress")
    .maybeSingle();
  if (!data) return null;
  const soal = bacaSoal(data.questions);
  if (soal.length === 0) return null;
  return {
    id: data.id as string,
    passPercent: data.pass_percent as number,
    pelanggaran: (data.violations as number) ?? 0,
    soal,
    jawaban: bacaJawaban(data.answers),
  };
}