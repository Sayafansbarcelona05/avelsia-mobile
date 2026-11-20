import { jamValid, tanggalValid } from "./kalender-waktu";
import { supabase } from "./supabase";

export type HasilBelajar = { ok: boolean; pesan: string };

export type MasukanTopik = {
  judul: string;
  menit: string; // angka sebagai teks, kosong = tanpa estimasi
  tanggal: string; // kosong = tidak dijadwalkan
  jam: string; // kosong = tanpa jam
};

const SESI_BERAKHIR: HasilBelajar = {
  ok: false,
  pesan: "Sesi berakhir. Silakan masuk lagi.",
};

const STATUS_TOPIK = ["not_started", "in_progress", "done"];

function periksaTopik(n: MasukanTopik): string | null {
  if (n.judul.length < 1 || n.judul.length > 120) {
    return "Judul wajib diisi, maksimal 120 karakter.";
  }
  if (n.menit !== "") {
    if (!/^\d+$/.test(n.menit) || Number(n.menit) > 100000) {
      return "Estimasi menit harus angka 0 sampai 100000.";
    }
  }
  if (n.jam !== "") {
    if (n.tanggal === "") return "Isi tanggal belajar kalau kamu mengisi jam.";
    if (!jamValid(n.jam)) return "Jam belajar tidak valid.";
  }
  if (n.tanggal !== "") {
    if (!tanggalValid(n.tanggal)) return "Tanggal belajar tidak valid.";
    if (n.menit === "" || Number(n.menit) < 1) {
      return "Isi estimasi menit supaya sesi belajar bisa dijadwalkan.";
    }
    if (Number(n.menit) > 1440) {
      return "Sesi belajar maksimal 1440 menit. Kecilkan estimasi atau kosongkan tanggal.";
    }
  }
  return null;
}

// Pesan aturan bentrok dari database diawali "BENTROK: "
function pesanBentrokDb(pesan: string | undefined): string | null {
  const awal = "BENTROK: ";
  return pesan && pesan.startsWith(awal) ? pesan.slice(awal.length) : null;
}

// Pesan dari penjaga di database (trigger topik dan sub topik)
function pesanDatabase(pesan: string | undefined): string | null {
  if (!pesan) return null;
  if (pesan.includes("MAKSIMAL_DUA_TINGKAT")) {
    return "Sub topik tidak bisa punya sub topik lagi (maksimal dua tingkat).";
  }
  if (pesan.includes("BELUM_LULUS_LATIHAN")) {
    return "Topik ini baru bisa selesai setelah lulus latihan.";
  }
  if (
    pesan.includes("INDUK_BEDA_TUJUAN") ||
    pesan.includes("INDUK_TIDAK_DITEMUKAN") ||
    pesan.includes("INDUK_TIDAK_VALID")
  ) {
    return "Topik induk tidak valid.";
  }
  return null;
}

export async function buatTopik(
  userId: string,
  goalId: string,
  indukId: string | null,
  n: MasukanTopik
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!goalId) return { ok: false, pesan: "Tujuan tidak ditemukan." };

  const salah = periksaTopik(n);
  if (salah) return { ok: false, pesan: salah };

  // Urutan baru ditaruh paling bawah di antara saudaranya (topik se-induk)
  let kueri = supabase
    .from("learning_topics")
    .select("position")
    .eq("goal_id", goalId)
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1);
  kueri = indukId ? kueri.eq("parent_id", indukId) : kueri.is("parent_id", null);
  const { data: terakhir } = await kueri;
  const posisi = terakhir && terakhir.length > 0 ? terakhir[0].position + 1 : 0;

  const { data: baru, error } = await supabase
    .from("learning_topics")
    .insert({
      goal_id: goalId,
      parent_id: indukId,
      title: n.judul,
      estimated_minutes: n.menit === "" ? null : Number(n.menit),
      position: posisi,
    })
    .select("id")
    .single();

  if (error || !baru) {
    return {
      ok: false,
      pesan: pesanDatabase(error?.message) ?? "Gagal disimpan. Coba lagi.",
    };
  }

  // Tanggal diisi: buat satu sesi belajar terjadwal untuk topik/sub topik ini
  if (n.tanggal !== "") {
    const { error: galatSesi } = await supabase.from("study_sessions").insert({
      goal_id: goalId,
      topic_id: baru.id,
      session_date: n.tanggal,
      start_time: n.jam || null,
      status: "planned",
      planned_minutes: Number(n.menit),
      source: "manual",
    });
    if (galatSesi) {
      // Batalkan topiknya supaya tidak ada yang setengah jadi
      await supabase.from("learning_topics").delete().eq("id", baru.id);
      return {
        ok: false,
        pesan:
          pesanBentrokDb(galatSesi.message) ??
          "Jadwal belajar gagal disimpan, topik tidak ditambahkan. Coba lagi.",
      };
    }
  }

  return { ok: true, pesan: "Tersimpan." };
}

export async function ubahTopik(
  userId: string,
  id: string,
  n: MasukanTopik
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Topik tidak ditemukan." };

  const salah = periksaTopik(n);
  if (salah) return { ok: false, pesan: salah };

  // Topik yang punya sub topik: estimasinya dihitung otomatis, jadi tidak diubah di sini
  const { data: anak } = await supabase
    .from("learning_topics")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  const punyaAnak = !!anak && anak.length > 0;

  const { data, error } = await supabase
    .from("learning_topics")
    .update({
      title: n.judul,
      ...(punyaAnak
        ? {}
        : { estimated_minutes: n.menit === "" ? null : Number(n.menit) }),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Gagal diperbarui. Coba lagi." };
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Topik tidak ditemukan." };
  }
  return { ok: true, pesan: "Diperbarui." };
}

export async function ubahStatusTopik(
  userId: string,
  id: string,
  status: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Topik tidak ditemukan." };
  if (!STATUS_TOPIK.includes(status)) {
    return { ok: false, pesan: "Status tidak valid." };
  }

  const { data: anak } = await supabase
    .from("learning_topics")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  if (anak && anak.length > 0) {
    return {
      ok: false,
      pesan: "Status topik ini mengikuti sub topiknya. Ubah status sub topiknya.",
    };
  }

  const { data, error } = await supabase
    .from("learning_topics")
    .update({ study_status: status })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return {
      ok: false,
      pesan: pesanDatabase(error.message) ?? "Status gagal diubah. Coba lagi.",
    };
  }
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Topik tidak ditemukan." };
  }
  return { ok: true, pesan: "Status diubah." };
}

// Menggeser urutan hanya di antara saudaranya (topik se-induk)
export async function geserTopik(
  userId: string,
  goalId: string,
  id: string,
  arah: "naik" | "turun"
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id || !goalId) return { ok: false, pesan: "Topik tidak ditemukan." };

  const { data: ini } = await supabase
    .from("learning_topics")
    .select("parent_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!ini) return { ok: false, pesan: "Topik tidak ditemukan." };

  let kueri = supabase
    .from("learning_topics")
    .select("id, position")
    .eq("goal_id", goalId)
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  kueri = ini.parent_id
    ? kueri.eq("parent_id", ini.parent_id)
    : kueri.is("parent_id", null);
  const { data, error } = await kueri;
  if (error || !data) {
    return { ok: false, pesan: "Urutan gagal diubah. Coba lagi." };
  }

  const urutan = data.map((t) => t.id as string);
  const i = urutan.indexOf(id);
  const j = arah === "naik" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= urutan.length) {
    return { ok: false, pesan: "Sudah di ujung daftar." };
  }
  [urutan[i], urutan[j]] = [urutan[j], urutan[i]];

  const hasil = await Promise.all(
    urutan.map((topikId, posisi) =>
      supabase
        .from("learning_topics")
        .update({ position: posisi })
        .eq("id", topikId)
        .eq("user_id", userId)
    )
  );
  if (hasil.some((h) => h.error)) {
    return { ok: false, pesan: "Urutan gagal disimpan. Coba lagi." };
  }
  return { ok: true, pesan: "Urutan diubah." };
}

export async function hapusTopik(
  userId: string,
  id: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Topik tidak ditemukan." };

  const { data, error } = await supabase
    .from("learning_topics")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Gagal dihapus. Coba lagi." };
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Topik tidak ditemukan atau tidak bisa dihapus." };
  }
  return { ok: true, pesan: "Dihapus." };
}

/* ====== Sesi belajar ====== */

export type MasukanSesi = {
  jenis: "rencana" | "catat";
  topik: string; // id topik, kosong = tanpa topik
  tanggal: string;
  jam: string; // kosong = tanpa jam
  menit: string;
  catatan: string;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function periksaSesi(n: MasukanSesi, mode: "tambah" | "edit"): string | null {
  if (mode === "tambah" && !["rencana", "catat"].includes(n.jenis)) {
    return "Jenis sesi tidak valid.";
  }
  if (!n.tanggal) return "Tanggal sesi wajib diisi.";
  if (!tanggalValid(n.tanggal)) return "Tanggal sesi tidak valid.";
  if (n.jam && !jamValid(n.jam)) return "Jam sesi tidak valid.";
  if (n.topik && !UUID.test(n.topik)) return "Topik tidak valid.";
  if (!/^\d+$/.test(n.menit) || Number(n.menit) < 1 || Number(n.menit) > 1440) {
    return "Durasi harus angka 1 sampai 1440 menit.";
  }
  if (n.catatan.length > 1000) return "Catatan maksimal 1000 karakter.";
  return null;
}

// Setelah sesi selesai, topik/sub topik jadi "Sedang dipelajari".
// "Selesai" hanya bisa lewat lulus latihan (dijaga trigger di database).
async function tandaiSedangDipelajari(topikId: string | null) {
  if (!topikId) return;
  await supabase
    .from("learning_topics")
    .update({ study_status: "in_progress" })
    .eq("id", topikId)
    .eq("study_status", "not_started");
}

// True kalau total waktu sesi selesai topik/sub topik sudah mencapai estimasinya.
// Topik tanpa estimasi tidak pernah dianggap habis.
async function waktuTopikHabis(topikId: string): Promise<boolean> {
  const { data: topik } = await supabase
    .from("learning_topics")
    .select("estimated_minutes")
    .eq("id", topikId)
    .maybeSingle();
  if (!topik || topik.estimated_minutes == null) return false;

  const { data: sesi } = await supabase
    .from("study_sessions")
    .select("actual_minutes")
    .eq("topic_id", topikId)
    .eq("status", "done");

  const total = (sesi ?? []).reduce(
    (a, x) => a + ((x.actual_minutes as number) ?? 0),
    0
  );
  return total >= (topik.estimated_minutes as number);
}

const PESAN_WAKTU_HABIS =
  "Waktu belajar topik ini sudah habis. Selesaikan lewat latihan.";

export async function buatSesi(
  userId: string,
  goalId: string,
  n: MasukanSesi
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!goalId) return { ok: false, pesan: "Tujuan tidak ditemukan." };

  const salah = periksaSesi(n, "tambah");
  if (salah) return { ok: false, pesan: salah };

  if (n.topik && (await waktuTopikHabis(n.topik))) {
    return { ok: false, pesan: PESAN_WAKTU_HABIS };
  }

  const menit = Number(n.menit);
  const dasar = {
    goal_id: goalId,
    topic_id: n.topik || null,
    session_date: n.tanggal,
    start_time: n.jam || null,
    notes: n.catatan || null,
    source: "manual",
  };

  const { error } = await supabase.from("study_sessions").insert(
    n.jenis === "catat"
      ? {
          ...dasar,
          status: "done",
          actual_minutes: menit,
          elapsed_seconds: menit * 60,
          completed_at: new Date().toISOString(),
        }
      : { ...dasar, status: "planned", planned_minutes: menit }
  );

  if (error) {
    return {
      ok: false,
      pesan: pesanBentrokDb(error.message) ?? "Sesi gagal disimpan. Coba lagi.",
    };
  }

  if (n.jenis === "catat") await tandaiSedangDipelajari(n.topik || null);
  return { ok: true, pesan: "Sesi tersimpan." };
}

export async function ubahSesi(
  userId: string,
  id: string,
  n: MasukanSesi
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Sesi tidak ditemukan." };

  const salah = periksaSesi(n, "edit");
  if (salah) return { ok: false, pesan: salah };

  const { data: ada } = await supabase
    .from("study_sessions")
    .select("status, topic_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!ada) return { ok: false, pesan: "Sesi tidak ditemukan." };

  if (
    n.topik &&
    n.topik !== ada.topic_id &&
    (await waktuTopikHabis(n.topik))
  ) {
    return { ok: false, pesan: PESAN_WAKTU_HABIS };
  }
  if (ada.status === "running") {
    return {
      ok: false,
      pesan: "Sesi sedang berjalan. Jeda atau selesaikan dulu sebelum mengedit.",
    };
  }

  const menit = Number(n.menit);
  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      topic_id: n.topik || null,
      session_date: n.tanggal,
      start_time: n.jam || null,
      notes: n.catatan || null,
      ...(ada.status === "done"
        ? { actual_minutes: menit, elapsed_seconds: menit * 60 }
        : { planned_minutes: menit }),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return {
      ok: false,
      pesan:
        pesanBentrokDb(error.message) ?? "Sesi gagal diperbarui. Coba lagi.",
    };
  }
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Sesi tidak ditemukan." };
  }

  if (ada.status === "done") await tandaiSedangDipelajari(n.topik || null);
  return { ok: true, pesan: "Sesi diperbarui." };
}

// Hanya untuk sesi yang belum berjalan: rencana <-> dilewati
export async function ubahStatusSesi(
  userId: string,
  id: string,
  status: "planned" | "skipped"
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Sesi tidak ditemukan." };
  if (status !== "planned" && status !== "skipped") {
    return { ok: false, pesan: "Status tidak valid." };
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", status === "skipped" ? "planned" : "skipped")
    .select("id");

  if (error) {
    return {
      ok: false,
      pesan:
        pesanBentrokDb(error.message) ?? "Status sesi gagal diubah. Coba lagi.",
    };
  }
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Status sesi tidak bisa diubah saat ini." };
  }
  return {
    ok: true,
    pesan: status === "skipped" ? "Sesi dilewati." : "Sesi direncanakan lagi.",
  };
}

export async function hapusSesi(
  userId: string,
  id: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Sesi tidak ditemukan." };

  const { data, error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Sesi gagal dihapus. Coba lagi." };
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Sesi tidak ditemukan atau tidak bisa dihapus." };
  }
  return { ok: true, pesan: "Sesi dihapus." };
}

/* ====== Timer sesi ====== */

// Pesan ramah untuk galat dari fungsi timer di database
function pesanTimer(error: { code?: string; message?: string }): string {
  const pesan = error.message ?? "";
  const bentrok = pesanBentrokDb(pesan);
  if (bentrok) return bentrok;
  if (error.code === "23505") {
    return "Masih ada timer yang berjalan di sesi lain. Jeda atau selesaikan dulu.";
  }
  if (pesan.includes("SESI_TIDAK_BISA_DIMULAI")) {
    return "Sesi ini tidak bisa dimulai. Mungkin sudah berjalan atau selesai.";
  }
  if (pesan.includes("SESI_TIDAK_BERJALAN")) {
    return "Timer sesi ini sudah tidak berjalan.";
  }
  return "Timer gagal diproses. Coba lagi.";
}

export async function mulaiTimer(
  userId: string,
  id: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Sesi tidak ditemukan." };

  const { error } = await supabase.rpc("mulai_timer_sesi", { p_id: id });
  if (error) return { ok: false, pesan: pesanTimer(error) };
  return { ok: true, pesan: "Timer dimulai." };
}

export async function hentikanTimer(
  userId: string,
  id: string,
  selesai: boolean
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Sesi tidak ditemukan." };

  const { error } = await supabase.rpc("hentikan_timer_sesi", {
    p_id: id,
    p_selesai: selesai,
  });
  if (error) return { ok: false, pesan: pesanTimer(error) };

  if (selesai) {
    const { data: sesiIni } = await supabase
      .from("study_sessions")
      .select("topic_id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    await tandaiSedangDipelajari((sesiIni?.topic_id as string | null) ?? null);
  }

  return { ok: true, pesan: selesai ? "Sesi selesai." : "Timer dijeda." };
}

/* ====== Tujuan belajar ====== */

export type MasukanTujuan = {
  judul: string;
  target: string; // kosong = tanpa target hasil
  tanggal: string; // kosong = tanpa tanggal target
  level: string; // pemula | menengah | mahir
  menit: string; // angka sebagai teks, kosong = tanpa target menit
  kriteria: string; // kosong = tanpa kriteria
};

const LEVEL_TUJUAN = ["pemula", "menengah", "mahir"];
const STATUS_TUJUAN = ["active", "completed", "archived"];

function periksaTujuan(n: MasukanTujuan): string | null {
  if (n.judul.length < 1 || n.judul.length > 120) {
    return "Judul wajib diisi, maksimal 120 karakter.";
  }
  if (n.target.length > 500) return "Target hasil maksimal 500 karakter.";
  if (n.kriteria.length > 500) return "Kriteria selesai maksimal 500 karakter.";
  if (n.tanggal && !tanggalValid(n.tanggal)) return "Tanggal target tidak valid.";
  if (!LEVEL_TUJUAN.includes(n.level)) return "Level awal tidak valid.";
  if (n.menit !== "") {
    if (!/^\d+$/.test(n.menit) || Number(n.menit) > 10080) {
      return "Menit per minggu harus angka 0 sampai 10080.";
    }
  }
  return null;
}

function barisTujuan(n: MasukanTujuan) {
  return {
    title: n.judul,
    target_outcome: n.target || null,
    target_date: n.tanggal || null,
    starting_level: n.level,
    weekly_minutes: n.menit === "" ? null : Number(n.menit),
    completion_criteria: n.kriteria || null,
  };
}

export async function buatTujuan(
  userId: string,
  n: MasukanTujuan
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;

  const salah = periksaTujuan(n);
  if (salah) return { ok: false, pesan: salah };

  const { error } = await supabase.from("learning_goals").insert(barisTujuan(n));
  if (error) return { ok: false, pesan: "Tujuan gagal disimpan. Coba lagi." };
  return { ok: true, pesan: "Tujuan tersimpan." };
}

export async function ubahTujuan(
  userId: string,
  id: string,
  n: MasukanTujuan
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Tujuan tidak ditemukan." };

  const salah = periksaTujuan(n);
  if (salah) return { ok: false, pesan: salah };

  const { data, error } = await supabase
    .from("learning_goals")
    .update(barisTujuan(n))
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Tujuan gagal diperbarui. Coba lagi." };
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Tujuan tidak ditemukan." };
  }
  return { ok: true, pesan: "Tujuan diperbarui." };
}

export async function ubahStatusTujuan(
  userId: string,
  id: string,
  status: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Tujuan tidak ditemukan." };
  if (!STATUS_TUJUAN.includes(status)) {
    return { ok: false, pesan: "Status tidak valid." };
  }

  const { data, error } = await supabase
    .from("learning_goals")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { ok: false, pesan: "Status tujuan gagal diubah. Coba lagi." };
  }
  if (!data || data.length === 0) {
    return { ok: false, pesan: "Tujuan tidak ditemukan." };
  }
  return { ok: true, pesan: "Status tujuan diubah." };
}

export async function hapusTujuan(
  userId: string,
  id: string
): Promise<HasilBelajar> {
  if (!userId) return SESI_BERAKHIR;
  if (!id) return { ok: false, pesan: "Tujuan tidak ditemukan." };

  const { data, error } = await supabase
    .from("learning_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) return { ok: false, pesan: "Tujuan gagal dihapus. Coba lagi." };
  if (!data || data.length === 0) {
    return {
      ok: false,
      pesan: "Tujuan tidak ditemukan atau tidak bisa dihapus.",
    };
  }
  return { ok: true, pesan: "Tujuan dihapus." };
}