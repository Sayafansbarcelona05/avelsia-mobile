import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export type Profil = {
  username: string | null;
  avatarUrl: string | null;
  zona: string;
  aiAktif: boolean;
};

export function useProfil() {
  const { session } = useAuth();
  const idUser = session?.user.id;
  const [profil, setProfil] = useState<Profil>({
    username: null,
    avatarUrl: null,
    zona: "Asia/Jakarta",
    aiAktif: false,
  });
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    if (!idUser) return;
    let aktif = true;

    async function muat() {
      const { data } = await supabase
        .from("user_preferences")
        .select("username, avatar_path, timezone, ai_enabled")
        .eq("user_id", idUser)
        .maybeSingle();
      if (!aktif) return;

      const dasar: Profil = {
        username: data?.username ?? null,
        avatarUrl: null,
        zona: data?.timezone ?? "Asia/Jakarta",
        aiAktif: data?.ai_enabled === true,
      };
      setProfil(dasar);
      setMemuat(false);

      // Bucket "avatars" privat: minta link sementara (berlaku 1 jam)
      if (!data?.avatar_path) return;
      const { data: tanda } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 3600);
      if (!aktif) return;
      if (tanda?.signedUrl) setProfil({ ...dasar, avatarUrl: tanda.signedUrl });
    }

    muat();
    return () => {
      aktif = false;
    };
  }, [idUser]);

  return { profil, memuat };
}