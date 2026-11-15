import type { Session } from "@supabase/supabase-js";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SITUS } from "./situs";
import { supabase } from "./supabase";

type HasilMasuk = { ok: true } | { ok: false; pesan: string };

type NilaiAuth = {
  session: Session | null;
  memuat: boolean;
  masuk: (
    email: string,
    password: string,
    captchaToken: string
  ) => Promise<HasilMasuk>;
  masukGoogle: () => Promise<HasilMasuk>;
  keluar: () => Promise<void>;
  animasiKeluar: boolean;
  lanjutkanKeluar: () => Promise<void>;
  akhiriAnimasiKeluar: () => void;
};

const AuthContext = createContext<NilaiAuth | null>(null);

const PESAN_GOOGLE = "Masuk dengan Google belum berhasil. Coba lagi.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [animasiKeluar, setAnimasiKeluar] = useState(false);

  useEffect(() => {
    let aktif = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!aktif) return;
      setSession(data.session);
      setMemuat(false);
    });

    const { data: langganan } = supabase.auth.onAuthStateChange(
      (_event, sesiBaru) => {
        setSession(sesiBaru);
      }
    );

    return () => {
      aktif = false;
      langganan.subscription.unsubscribe();
    };
  }, []);

  const masuk = useCallback(
    async (
      email: string,
      password: string,
      captchaToken: string
    ): Promise<HasilMasuk> => {
      const pengendali = new AbortController();
      const waktu = setTimeout(() => pengendali.abort(), 20000);
      try {
        const res = await fetch(`${SITUS}/api/v1/auth/masuk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, captchaToken }),
          signal: pengendali.signal,
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          access_token?: string;
          refresh_token?: string;
        } | null;

        if (!res.ok || !data?.access_token || !data.refresh_token) {
          return {
            ok: false,
            pesan: data?.error ?? "Masuk belum berhasil. Coba lagi.",
          };
        }

        const { error } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (error) {
          return { ok: false, pesan: "Sesi belum bisa dipasang. Coba lagi." };
        }
        return { ok: true };
      } catch {
        return {
          ok: false,
          pesan: "Tidak bisa terhubung. Periksa koneksi internetmu.",
        };
      } finally {
        clearTimeout(waktu);
      }
    },
    []
  );

  // Masuk dengan Google lewat browser sistem (PKCE). Pesan kosong = dibatalkan pengguna.
  const masukGoogle = useCallback(async (): Promise<HasilMasuk> => {
    try {
      const redirectTo = ExpoLinking.createURL("auth-callback");
      if (__DEV__) console.log("Redirect Google:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) return { ok: false, pesan: PESAN_GOOGLE };

      const hasil = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (hasil.type !== "success") return { ok: false, pesan: "" };

      const kode = ExpoLinking.parse(hasil.url).queryParams?.code;
      if (typeof kode !== "string" || kode.length === 0) {
        return { ok: false, pesan: PESAN_GOOGLE };
      }

      const { error: errorTukar } =
        await supabase.auth.exchangeCodeForSession(kode);
      if (errorTukar) return { ok: false, pesan: PESAN_GOOGLE };

      return { ok: true };
    } catch {
      return { ok: false, pesan: PESAN_GOOGLE };
    }
  }, []);

  // Hanya memicu animasi. Proses keluar yang sebenarnya dijalankan animasi
  // lewat lanjutkanKeluar saat layar sudah tertutup penuh.
  const keluar = useCallback(async () => {
    setAnimasiKeluar(true);
  }, []);

  // scope "local": hanya keluar di HP ini, perangkat lain (misalnya web) tetap masuk
  const lanjutkanKeluar = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Sesi lokal tetap dibersihkan oleh supabase-js walau jaringan bermasalah
    }
  }, []);

  const akhiriAnimasiKeluar = useCallback(() => setAnimasiKeluar(false), []);

  const nilai = useMemo(
    () => ({
      session,
      memuat,
      masuk,
      masukGoogle,
      keluar,
      animasiKeluar,
      lanjutkanKeluar,
      akhiriAnimasiKeluar,
    }),
    [
      session,
      memuat,
      masuk,
      masukGoogle,
      keluar,
      animasiKeluar,
      lanjutkanKeluar,
      akhiriAnimasiKeluar,
    ]
  );

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useAuth(): NilaiAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}