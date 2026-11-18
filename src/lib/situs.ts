// Alamat web Avelsia yang dipakai aplikasi (endpoint login dan halaman CAPTCHA)
export const SITUS = "https://avelsia.vercel.app";

// Alamat server untuk fitur AI. Kalau EXPO_PUBLIC_AI_URL diisi di .env.local
// (misalnya http://192.168.1.4:3000 saat uji di laptop), itu yang dipakai.
// Kalau kosong, memakai SITUS.
export const SITUS_AI = (process.env.EXPO_PUBLIC_AI_URL || SITUS).replace(
  /\/+$/,
  ""
);