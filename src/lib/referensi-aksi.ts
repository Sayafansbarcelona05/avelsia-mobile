import type { HasilBelajar } from "./belajar-aksi";
import { supabase } from "./supabase";

export type MasukanReferensi = {
  judul: string;
  tautan: string; // kosong = tanpa tautan
  jenis: string; // artikel | video | buku | dokumentasi | lainnya
  catatan: string;
};

const JENIS = ["artikel", "video", "buku", "dokumentasi", "lainnya"];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAKS_PER_TOPIK = 30;

const SESI_BERAKHIR: HasilBelajar = {
  ok: false,
  pesan: "Sesi berakhir. Silakan masuk lagi.",
};

// Hanya http:// dan https:// yang diterima (bukan javascript:, data:, ftp:, dst.)
function tautanValid(t: string): boolean {
  if (t.length > 2000) return false;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function rapikan(n: MasukanReferensi): MasukanReferensi {
  return {
    judul: n.judul.trim(),
    tautan: n.tautan.trim(),
    jenis: n.jenis.trim(),
    catatan: n.catatan.trim(),
  };
}

function periksa(n: MasukanReferensi): string | null {
  if (n.judul.length < 1 || n.judul.length > 200) {
    return "Judul wajib diisi, maksimal 200 karakter.";
  }
  if (n.tautan && !tautanValid(n.tautan)) {
    return "Tautan harus diawali http:// atau https:// dan berupa alamat yang valid.";
  }
  if (!JENIS.includes(n.jenis)) return "Jenis referensi tidak valid.";
  if (n.catatan.length > 1000) return "Catatan maksimal 1000 karakter.";
  return null;
}

export async function buatReferensi(
  userId: string,
  goalId: string,
  topicId: string,
  masukan: MasukanReferensi
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!UUID.test(goalId) || !UUID.test(topicId)) {
    return { ok: false, pesan: "Topik tidak ditemukan." };
  }

  const n = rapikan(masukan);
  const salah = periksa(n);
  if (salah) return { ok: false, pesan: salah };

  const { count } = await supabase
    .from("learning_references")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);
  if ((count ?? 0) >= MAKS_PER_TOPIK) {
    return {
      ok: false,
      pesan: `Maksimal ${MAKS_PER_TOPIK} referensi per topik.`,
    };
  }

  const { error } = await supabase.from("learning_references").insert({
    goal_id: goalId,
    topic_id: topicId,
    title: n.judul,
    url: n.tautan || null,
    kind: n.jenis,
    notes: n.catatan || null,
  });
  if (error) {
    return { ok: false, pesan: "Referensi gagal disimpan. Coba lagi." };
  }
  return { ok: true, pesan: "Referensi berhasil ditambahkan." };
}

export async function ubahReferensi(
  userId: string,
  id: string,
  masukan: MasukanReferensi
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!UUID.test(id)) return { ok: false, pesan: "Referensi tidak ditemukan." };

  const n = rapikan(masukan);
  const salah = periksa(n);
  if (salah) return { ok: false, pesan: salah };

  const { data, error } = await supabase
    .from("learning_references")
    .update({
      title: n.judul,
      url: n.tautan || null,
      kind: n.jenis,
      notes: n.catatan || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { ok: false, pesan: "Referensi gagal diperbarui. Coba lagi." };
  }
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Referensi tidak ditemukan." };
  }
  return { ok: true, pesan: "Referensi berhasil diperbarui." };
}

export async function hapusReferensi(
  userId: string,
  id: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!UUID.test(id)) return { ok: false, pesan: "Referensi tidak ditemukan." };

  const { data, error } = await supabase
    .from("learning_references")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Referensi gagal dihapus. Coba lagi." };
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Referensi tidak ditemukan." };
  }
  return { ok: true, pesan: "Referensi berhasil dihapus." };
}