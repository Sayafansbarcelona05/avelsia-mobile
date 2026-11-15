const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const pad = (n: number) => String(n).padStart(2, "0");

type Bagian = { y: number; m: number; d: number; h: number; mi: number; s: number };

const OPSI: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
};

// Komponen tanggal dan jam pada zona tertentu
function bagianZona(tanggal: Date, zona: string): Bagian {
  let pecah: Intl.DateTimeFormatPart[];
  try {
    pecah = new Intl.DateTimeFormat("en-US", { ...OPSI, timeZone: zona }).formatToParts(tanggal);
  } catch {
    // Zona tidak dikenal: pakai zona perangkat
    pecah = new Intl.DateTimeFormat("en-US", OPSI).formatToParts(tanggal);
  }
  const ambil = (t: string) => Number(pecah.find((p) => p.type === t)?.value ?? 0);
  return {
    y: ambil("year"),
    m: ambil("month"),
    d: ambil("day"),
    h: ambil("hour") % 24,
    mi: ambil("minute"),
    s: ambil("second"),
  };
}

export function rentangHariIni(zona: string) {
  const sekarang = new Date();
  const b = bagianZona(sekarang, zona);
  const hariIni = `${b.y}-${pad(b.m)}-${pad(b.d)}`;

  // Selisih zona dari UTC (ms), dihitung dari jam dinding di zona itu
  const offsetMs =
    Date.UTC(b.y, b.m - 1, b.d, b.h, b.mi, b.s) -
    Math.floor(sekarang.getTime() / 1000) * 1000;

  const mulaiMs = Date.UTC(b.y, b.m - 1, b.d) - offsetMs;
  return {
    hariIni,
    mulai: new Date(mulaiMs).toISOString(),
    selesai: new Date(mulaiMs + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function formatJam(iso: string, zona: string) {
  const b = bagianZona(new Date(iso), zona);
  return `${pad(b.h)}:${pad(b.mi)}`;
}

// Contoh: "Rabu, 11 November 2026"
export function tanggalPanjang(zona: string) {
  const b = bagianZona(new Date(), zona);
  const hariKe = new Date(Date.UTC(b.y, b.m - 1, b.d)).getUTCDay();
  return `${HARI[hariKe]}, ${b.d} ${BULAN[b.m - 1]} ${b.y}`;
}

export function sapaan(zona: string) {
  const { h } = bagianZona(new Date(), zona);
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

// due_date adalah tanggal murni ("2026-11-11"), jadi dipecah manual agar tidak bergeser sehari
export function formatTenggat(tanggal: string | null, jam: string | null) {
  if (!tanggal) return "Tanpa tenggat";
  const [, m, d] = tanggal.split("-").map(Number);
  const t = `${d} ${BULAN_PENDEK[m - 1]}`;
  return jam ? `${t}, ${jam.slice(0, 5)}` : t;
}