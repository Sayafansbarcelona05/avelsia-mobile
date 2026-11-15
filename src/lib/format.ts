const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatMenit(m: number) {
  if (m < 60) return `${m} mnt`;
  const j = Math.floor(m / 60);
  const s = m % 60;
  return s ? `${j} j ${s} mnt` : `${j} j`;
}

export function keMenit(jam: string) {
  const [h, m] = jam.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function akhirJam(jam: string, menit: number) {
  const total = (keMenit(jam) + menit) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

// Tanggal murni ("2026-11-12") dipecah manual supaya tidak bergeser sehari
export function formatHari(t: string) {
  const [y, m, d] = t.split("-").map(Number);
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI_PENDEK[hari]}, ${d} ${BULAN_PENDEK[m - 1]}`;
}

export function buatFormatUang(mata: string) {
  const awalan = mata === "IDR" ? "Rp" : mata;
  return (n: number) => {
    const bulat = Math.round(Math.abs(n));
    const teks = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${n < 0 ? "-" : ""}${awalan} ${teks}`;
  };
}