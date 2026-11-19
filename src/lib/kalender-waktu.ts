export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const NAMA_HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const NAMA_HARI_PENUH = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export const pad = (n: number) => String(n).padStart(2, "0");

// Tambah (atau kurangi) hari pada teks tanggal YYYY-MM-DD
export function tambahHari(tgl: string, n: number) {
  const [y, m, d] = tgl.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

function bagianWaktu(d: Date, tz: string) {
  const bagian = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const ambil = (jenis: string) =>
    bagian.find((p) => p.type === jenis)?.value ?? "";
  const jam = ambil("hour");
  return {
    tahun: ambil("year"),
    bulan: ambil("month"),
    hari: ambil("day"),
    jam: jam === "24" ? "00" : jam,
    menit: ambil("minute"),
  };
}

// Tanggal (YYYY-MM-DD) dari sebuah waktu, menurut zona waktu pengguna
export function tglLokal(d: Date, tz: string) {
  const p = bagianWaktu(d, tz);
  return `${p.tahun}-${p.bulan}-${p.hari}`;
}

// Jam (HH:MM) dari sebuah waktu, menurut zona waktu pengguna
export function jamLokal(d: Date, tz: string) {
  const p = bagianWaktu(d, tz);
  return `${p.jam}:${p.menit}`;
}

export function tglPendek(t: string) {
  return `${t.slice(8, 10)}/${t.slice(5, 7)}`;
}

// Kode bulan "YYYY-MM" yang bergeser sejauh selisih bulan
export function bulanLain(tahun: number, bulan: number, selisih: number) {
  const x = new Date(Date.UTC(tahun, bulan - 1 + selisih, 1));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`;
}

export function keMenit(jam: string) {
  const [h, m] = jam.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function akhirJam(jam: string, menit: number) {
  const total = (keMenit(jam) + menit) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatMenit(m: number) {
  if (m < 60) return `${m} mnt`;
  const j = Math.floor(m / 60);
  const s = m % 60;
  return s ? `${j} j ${s} mnt` : `${j} j`;
}

export function tanggalValid(t: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const cek = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(cek.getTime()) && cek.toISOString().slice(0, 10) === t;
}

export function jamValid(j: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(j);
}

// Selisih (ms) antara waktu dinding di zona tz dan UTC pada saat tertentu
function selisihZona(tanggal: Date, tz: string) {
  const bagian = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(tanggal);
  const ambil = (jenis: string) =>
    Number(bagian.find((p) => p.type === jenis)?.value);
  const sebagaiUtc = Date.UTC(
    ambil("year"),
    ambil("month") - 1,
    ambil("day"),
    ambil("hour") % 24,
    ambil("minute"),
    ambil("second")
  );
  return sebagaiUtc - tanggal.getTime();
}

// Mengubah tanggal + jam di zona waktu pengguna menjadi waktu UTC yang tepat
export function zonaKeUtc(tanggal: string, jam: string, tz: string) {
  const [y, m, d] = tanggal.split("-").map(Number);
  const [h, mnt] = jam.split(":").map(Number);
  const tebakan = Date.UTC(y, m - 1, d, h, mnt);
  const selisih = selisihZona(new Date(tebakan), tz);
  let hasil = tebakan - selisih;
  const selisihBaru = selisihZona(new Date(hasil), tz);
  if (selisihBaru !== selisih) hasil = tebakan - selisihBaru;
  return new Date(hasil);
}

// Format DD/MM/YYYY HH:MM menurut zona waktu pengguna
export function formatLokal(d: Date, tz: string) {
  const p = bagianWaktu(d, tz);
  return `${p.hari}/${p.bulan}/${p.tahun} ${p.jam}:${p.menit}`;
}