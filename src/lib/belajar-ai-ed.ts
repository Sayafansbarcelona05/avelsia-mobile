import type { PayloadTopik, RefAI, SesiUsulan, TopikAI } from "./belajar-ai";

/* ====== Topik, sub topik, dan referensi yang bisa diedit ====== */

export type RefEd = {
  kid: string;
  judul: string;
  jenis: string;
  catatan: string;
  tautan: string;
  pilih: boolean;
};
export type SubEd = {
  kid: string;
  judul: string;
  menit: string;
  pilih: boolean;
  ref: RefEd[];
};
export type TopikEd = {
  kid: string;
  judul: string;
  menit: string;
  pilih: boolean;
  sub: SubEd[];
  ref: RefEd[];
};

export function refKeEd(kidInduk: string, daftar: RefAI[] | undefined): RefEd[] {
  return (daftar ?? []).map((r, i) => ({
    kid: `${kidInduk}r${i + 1}`,
    judul: r.judul,
    jenis: r.jenis,
    catatan: r.catatan,
    tautan: r.tautan,
    pilih: true,
  }));
}

export function subKeEd(s: {
  kid: string;
  judul: string;
  menit: number;
  ref?: RefAI[];
}): SubEd {
  return {
    kid: s.kid,
    judul: s.judul,
    menit: String(s.menit),
    pilih: true,
    ref: refKeEd(s.kid, s.ref),
  };
}

export function topikKeEd(daftar: TopikAI[]): TopikEd[] {
  return daftar.map((t) => ({
    kid: t.kid,
    judul: t.judul,
    menit: t.menit == null ? "" : String(t.menit),
    pilih: true,
    sub: t.sub.map(subKeEd),
    ref: refKeEd(t.kid, t.ref),
  }));
}

function bangunRef(daftar: RefEd[]): RefAI[] | string {
  const hasil: RefAI[] = [];
  for (const r of daftar) {
    if (!r.pilih) continue;
    const judul = r.judul.trim();
    if (judul.length < 1 || judul.length > 200) {
      return "Judul referensi wajib diisi, maksimal 200 karakter.";
    }
    hasil.push({ judul, jenis: r.jenis, catatan: r.catatan, tautan: r.tautan });
  }
  return hasil;
}

const cekJudul = (j: string) => j.trim().length >= 1 && j.trim().length <= 120;
const cekMenit = (m: string) => {
  const n = Number(m);
  return Number.isInteger(n) && n >= 1 && n <= 100000;
};

// Daftar sub topik yang dipilih, atau pesan kesalahan
export function bangunSub(sub: SubEd[]): PayloadTopik["sub"] | string {
  const hasil: PayloadTopik["sub"] = [];
  for (const s of sub) {
    if (!s.pilih) continue;
    if (!cekJudul(s.judul)) {
      return "Judul sub topik wajib diisi, maksimal 120 karakter.";
    }
    if (!cekMenit(s.menit)) {
      return `Estimasi "${s.judul.trim()}" harus angka bulat 1 sampai 100000.`;
    }
    const ref = bangunRef(s.ref);
    if (typeof ref === "string") return ref;
    hasil.push({ kid: s.kid, judul: s.judul.trim(), menit: Number(s.menit), ref });
  }
  return hasil;
}

// Topik yang dipilih, atau pesan kesalahan
export function bangunTopik(topik: TopikEd[]): PayloadTopik[] | string {
  const hasil: PayloadTopik[] = [];
  for (const t of topik) {
    if (!t.pilih) continue;
    if (!cekJudul(t.judul)) {
      return "Judul topik wajib diisi, maksimal 120 karakter.";
    }
    if (t.sub.length === 0) {
      if (!cekMenit(t.menit)) {
        return `Estimasi "${t.judul.trim()}" harus angka bulat 1 sampai 100000.`;
      }
      const ref = bangunRef(t.ref);
      if (typeof ref === "string") return ref;
      hasil.push({
        kid: t.kid,
        judul: t.judul.trim(),
        menit: Number(t.menit),
        sub: [],
        ref,
      });
      continue;
    }
    const sub = bangunSub(t.sub);
    if (typeof sub === "string") return sub;
    if (sub.length === 0) {
      return `Topik "${t.judul.trim()}" tidak punya sub topik yang dipilih. Pilih minimal satu sub topik atau hapus centang topiknya.`;
    }
    hasil.push({ kid: t.kid, judul: t.judul.trim(), menit: null, sub, ref: [] });
  }
  return hasil;
}

/* ====== Jadwal sesi belajar ====== */

export type PengaturanJadwalEd = {
  sekalian: boolean;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  maksHari: string;
};

export const JADWAL_AWAL: PengaturanJadwalEd = {
  sekalian: true,
  jamMulai: "19:00",
  jamSelesai: "21:00",
  durasi: "45",
  maksHari: "120",
};

export type SesiEd = {
  kid: string;
  target: string;
  namaTarget: string;
  tanggal: string;
  jam: string;
  menit: string;
  pilih: boolean;
  masalah: string | null;
};

export function sesiKeEd(daftar: SesiUsulan[]): SesiEd[] {
  return daftar.map((s) => ({
    kid: s.kid,
    target: s.target,
    namaTarget: s.namaTarget,
    tanggal: s.tanggal,
    jam: s.jam,
    menit: String(s.menit),
    pilih: true,
    masalah: null,
  }));
}

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// Tanggal YYYY-MM-DD dipecah manual supaya tidak bergeser sehari
export function tglId(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  if (!y || !m || !d) return t || "?";
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI[hari]}, ${d} ${BULAN[m - 1]} ${y}`;
}

// Pemeriksaan cepat di app (server tetap memeriksa ulang)
export function periksaPengaturan(n: PengaturanJadwalEd): string | null {
  const menitJam = (j: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(j);
    return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
  };
  const a = menitJam(n.jamMulai);
  const z = menitJam(n.jamSelesai);
  if (Number.isNaN(a) || Number.isNaN(z)) {
    return "Jam belajar tidak valid. Tulis dengan format JJ:MM, misalnya 19:00.";
  }
  if (z - a < 15) {
    return "Jam selesai belajar harus setelah jam mulai, di hari yang sama.";
  }
  const d = Number(n.durasi);
  const m = Number(n.maksHari);
  if (!Number.isInteger(d) || d < 15 || d > 240) {
    return "Durasi tiap sesi harus 15 sampai 240 menit.";
  }
  if (!Number.isInteger(m) || m < d || m > 720) {
    return "Maksimal menit per hari harus minimal sama dengan durasi sesi, dan paling banyak 720.";
  }
  return null;
}